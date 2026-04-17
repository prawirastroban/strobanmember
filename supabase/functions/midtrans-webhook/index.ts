import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;

async function sha512(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ok = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function mapStatus(transaction_status: string, fraud_status?: string) {
  let payment: "success" | "pending" | "failed" = "pending";
  if (transaction_status === "capture") {
    payment = fraud_status === "accept" ? "success" : "pending";
  } else if (transaction_status === "settlement") {
    payment = "success";
  } else if (["cancel", "deny", "expire", "failure"].includes(transaction_status)) {
    payment = "failed";
  } else if (transaction_status === "pending") {
    payment = "pending";
  }
  const bookingStatus = payment === "success" ? "confirmed" : "pending";
  const bookingPayment =
    payment === "success" ? "paid" : payment === "failed" ? "failed" : "pending_payment";
  return { payment, bookingStatus, bookingPayment };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Always return 200 to prevent Midtrans retry spam
  try {
    if (req.method !== "POST") return ok({ received: false, message: "method not allowed" });

    const body = await req.json().catch(() => null);
    if (!body) return ok({ received: false, message: "invalid json" });

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      payment_type,
      fraud_status,
    } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
      console.error("[midtrans-webhook] missing required fields", { order_id });
      return ok({ received: false, message: "missing fields" });
    }

    // 1. Verify signature
    const expected = await sha512(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`);
    if (expected !== signature_key) {
      console.error("[midtrans-webhook] invalid signature", { order_id });
      return ok({ received: false, message: "invalid signature" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Extract booking_id prefix from order_id (BK-{8chars}-{ts})
    const match = String(order_id).match(/^BK-([a-f0-9]{8})-/);
    if (!match) {
      console.warn("[midtrans-webhook] order_id format unrecognized", { order_id });
      return ok({ received: true, message: "no booking match" });
    }
    const bookingPrefix = match[1];

    const { data: bookings } = await admin.from("bookings")
      .select("id, user_id").like("id", `${bookingPrefix}%`).limit(1);
    const booking = bookings?.[0];
    if (!booking) {
      console.warn("[midtrans-webhook] booking not found", { order_id, bookingPrefix });
      return ok({ received: true, message: "booking not found" });
    }

    const { payment, bookingStatus, bookingPayment } =
      mapStatus(transaction_status, fraud_status);

    // 3. Idempotency: skip if a payment row already has this transaction_id at the same status
    const { data: existing } = await admin.from("payments")
      .select("id, payment_status")
      .eq("booking_id", booking.id)
      .eq("payment_method", `midtrans:${transaction_id}`)
      .maybeSingle();

    if (existing && existing.payment_status === payment) {
      console.log("[midtrans-webhook] already processed", { order_id, transaction_id, payment });
      return ok({ received: true, message: "already processed" });
    }

    if (existing) {
      // Same transaction, status changed (e.g. pending -> success): update in place
      await admin.from("payments")
        .update({ payment_status: payment })
        .eq("id", existing.id);
    } else {
      // Update the latest pending midtrans payment row OR insert a new one
      const { data: pendingRows } = await admin.from("payments")
        .select("id").eq("booking_id", booking.id).eq("payment_method", "midtrans")
        .order("created_at", { ascending: false }).limit(1);

      if (pendingRows?.[0]) {
        await admin.from("payments").update({
          payment_status: payment,
          payment_method: `midtrans:${transaction_id}`,
        }).eq("id", pendingRows[0].id);
      } else {
        await admin.from("payments").insert({
          booking_id: booking.id,
          user_id: booking.user_id,
          amount: Math.round(Number(gross_amount)),
          payment_method: `midtrans:${transaction_id}`,
          payment_status: payment,
        });
      }
    }

    // 4. Sync booking
    await admin.from("bookings").update({
      status: bookingStatus,
      payment_status: bookingPayment,
    }).eq("id", booking.id);

    console.log("[midtrans-webhook] processed", {
      order_id, transaction_id, payment_type, payment, ts: new Date().toISOString(),
    });

    return ok({ received: true, status: payment });
  } catch (err) {
    console.error("[midtrans-webhook] error:", err);
    // Always 200 to prevent retry storm; we have logs for investigation
    return ok({ received: false, message: "internal error" });
  }
});
