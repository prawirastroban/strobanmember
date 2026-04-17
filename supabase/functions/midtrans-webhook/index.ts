import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHash } from "https://deno.land/std@0.224.0/hash/mod.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

    // Verify signature
    const expected = await sha512(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`);
    if (expected !== signature_key) {
      console.error("Invalid signature for order", order_id);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map status
    let paymentStatus = "pending";
    let bookingStatus = "pending";
    let bookingPaymentStatus = "pending_payment";

    if (transaction_status === "capture") {
      paymentStatus = fraud_status === "accept" ? "success" : "pending";
    } else if (transaction_status === "settlement") {
      paymentStatus = "success";
    } else if (["cancel", "deny", "expire"].includes(transaction_status)) {
      paymentStatus = "failed";
    } else if (transaction_status === "pending") {
      paymentStatus = "pending";
    }

    if (paymentStatus === "success") {
      bookingStatus = "confirmed";
      bookingPaymentStatus = "paid";
    } else if (paymentStatus === "failed") {
      bookingPaymentStatus = "failed";
    }

    // Extract booking_id from order_id (BK-{8chars}-{ts})
    const match = order_id.match(/^BK-([a-f0-9]{8})-/);
    if (!match) {
      return new Response(JSON.stringify({ ok: true, note: "no match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bookingPrefix = match[1];

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find booking by id prefix
    const { data: bookings } = await admin.from("bookings")
      .select("id, user_id").like("id", `${bookingPrefix}%`).limit(1);
    const booking = bookings?.[0];
    if (!booking) {
      return new Response(JSON.stringify({ ok: true, note: "booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update latest pending payment for this booking
    const { data: payments } = await admin.from("payments")
      .select("id").eq("booking_id", booking.id).eq("payment_method", "midtrans")
      .order("created_at", { ascending: false }).limit(1);

    if (payments?.[0]) {
      await admin.from("payments").update({
        payment_status: paymentStatus,
      }).eq("id", payments[0].id);
    }

    await admin.from("bookings").update({
      status: bookingStatus,
      payment_status: bookingPaymentStatus,
    }).eq("id", booking.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
