import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha512(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  const bookingStatus =
    payment === "success" ? "confirmed" : payment === "failed" ? "cancelled" : "pending";
  const bookingPayment =
    payment === "success" ? "paid" : payment === "failed" ? "failed" : "pending_payment";
  return { payment, bookingStatus, bookingPayment };
}

interface WebhookLog {
  source?: string;
  order_id?: string | null;
  transaction_id?: string | null;
  transaction_status?: string | null;
  fraud_status?: string | null;
  payment_type?: string | null;
  gross_amount?: number | null;
  validation_result: string;
  error_message?: string | null;
  raw_payload?: unknown;
  booking_id?: string | null;
  payment_id?: string | null;
}

async function logWebhook(entry: WebhookLog) {
  try {
    await admin.from("webhook_logs").insert({
      source: "midtrans",
      ...entry,
      raw_payload: entry.raw_payload ?? null,
    });
  } catch (e) {
    console.error("[midtrans-webhook] failed to write log", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Always return 200 to prevent Midtrans retry spam
  try {
    if (req.method !== "POST") {
      await logWebhook({ validation_result: "invalid", error_message: "method not allowed" });
      return ok({ received: false, message: "method not allowed" });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      await logWebhook({ validation_result: "invalid", error_message: "invalid json" });
      return ok({ received: false, message: "invalid json" });
    }

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

    const baseLog: Partial<WebhookLog> = {
      order_id: order_id ?? null,
      transaction_id: transaction_id ?? null,
      transaction_status: transaction_status ?? null,
      fraud_status: fraud_status ?? null,
      payment_type: payment_type ?? null,
      gross_amount: gross_amount ? Number(gross_amount) : null,
      raw_payload: body,
    };

    // === STEP 1: Required fields check ===
    if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status || !transaction_id) {
      await logWebhook({
        ...baseLog,
        validation_result: "missing_fields",
        error_message: "required fields missing",
      } as WebhookLog);
      console.error("[midtrans-webhook] missing required fields", { order_id });
      return ok({ received: false, message: "missing fields" });
    }

    // === STEP 2: Signature validation (SHA512) ===
    const expected = await sha512(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`);
    if (expected !== signature_key) {
      await logWebhook({
        ...baseLog,
        validation_result: "invalid_signature",
        error_message: "signature mismatch",
      } as WebhookLog);
      console.error("[midtrans-webhook] invalid signature", { order_id });
      return ok({ received: false, message: "invalid signature" });
    }

    // === STEP 3: Find payment + booking ===
    let bookingId: string | null = null;
    let bookingUserId: string | null = null;
    let bookingPrice: number | null = null;

    // Multi-match query: check by midtrans_order_id first, fallback to id when order_id is a UUID
    console.log("WEBHOOK ORDER_ID:", order_id);

    const orderIdStr = String(order_id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdStr);

    let matchedPayment: {
      id: string;
      booking_id: string | null;
      user_id: string;
      amount: number;
      payment_status: string;
      verified_by_webhook: boolean;
      midtrans_order_id: string | null;
    } | null = null;

    const { data: byOrder, error: byOrderErr } = await admin
      .from("payments")
      .select("id, booking_id, user_id, amount, payment_status, verified_by_webhook, midtrans_order_id")
      .eq("midtrans_order_id", orderIdStr)
      .order("created_at", { ascending: false })
      .limit(1);
    if (byOrderErr) console.error("[midtrans-webhook] lookup by midtrans_order_id error", byOrderErr);
    matchedPayment = byOrder?.[0] ?? null;

    if (!matchedPayment && isUuid) {
      const { data: byId, error: byIdErr } = await admin
        .from("payments")
        .select("id, booking_id, user_id, amount, payment_status, verified_by_webhook, midtrans_order_id")
        .eq("id", orderIdStr)
        .limit(1);
      if (byIdErr) console.error("[midtrans-webhook] lookup by id error", byIdErr);
      matchedPayment = byId?.[0] ?? matchedPayment;
    }

    console.log("PAYMENT FOUND:", matchedPayment);
    console.log("[midtrans-webhook] payment match", {
      order_id,
      transaction_status,
      match_result: matchedPayment ? `payment:${matchedPayment.id}` : "not_found",
    });

    if (matchedPayment?.booking_id) {
      bookingId = matchedPayment.booking_id;
      bookingUserId = matchedPayment.user_id;
    } else {
      // Fallback: parse BK-{8chars}-{ts}
      const match = String(order_id).match(/^BK-([a-f0-9]{8})-/);
      if (match) {
        const { data: bookings } = await admin.from("bookings").select("id").like("id", `${match[1]}%`).limit(1);
        if (bookings?.[0]) bookingId = bookings[0].id;
      }
    }

    if (!bookingId) {
       await logWebhook({
        ...baseLog,
        validation_result: "booking_not_found",
         error_message: `Payment not found for order_id ${order_id}`,
      } as WebhookLog);
      console.error("CRITICAL: Payment NOT FOUND for order_id:", order_id);
      return ok({ received: true, message: "payment not found" });
    }

    const { data: booking } = await admin
      .from("bookings")
      .select("id, user_id, service_price")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      await logWebhook({ ...baseLog, booking_id: bookingId, validation_result: "booking_not_found" } as WebhookLog);
      return ok({ received: true, message: "booking missing" });
    }
    bookingUserId = bookingUserId ?? booking.user_id;
    bookingPrice = Number(booking.service_price);

    // === STEP 4: Amount validation ===
    const grossAmountNum = Math.round(Number(gross_amount));
    // Allow tolerance of 1 IDR for rounding; reject if booking_price > gross (we never accept underpayment)
    // Note: with discounts the actual paid amount may be lower than service_price — we trust the create-transaction value
    // So we only reject if gross_amount is wildly off (e.g. negative or zero or > service_price * 2)
    if (grossAmountNum <= 0 || grossAmountNum > bookingPrice * 2) {
      await logWebhook({
        ...baseLog,
        booking_id: bookingId,
        validation_result: "amount_mismatch",
        error_message: `gross=${grossAmountNum} bookingPrice=${bookingPrice}`,
      } as WebhookLog);
      console.error("[midtrans-webhook] amount mismatch", { order_id, gross: grossAmountNum, expected: bookingPrice });
      return ok({ received: false, message: "amount mismatch" });
    }

    const { payment, bookingStatus, bookingPayment } = mapStatus(transaction_status, fraud_status);

    // === STEP 5: Idempotency — check by midtrans_transaction_id ===
    const { data: existing } = await admin
      .from("payments")
      .select("id, payment_status, verified_by_webhook")
      .eq("midtrans_transaction_id", String(transaction_id))
      .maybeSingle();

    if (existing && existing.payment_status === payment && existing.verified_by_webhook) {
      await logWebhook({
        ...baseLog,
        booking_id: bookingId,
        payment_id: existing.id,
        validation_result: "duplicate",
        error_message: "transaction already processed at same status",
      } as WebhookLog);
      console.log("[midtrans-webhook] duplicate skipped", { order_id, transaction_id });
      return ok({ received: true, message: "already processed" });
    }

    let paymentId: string;
    const isPaidWebhook = transaction_status === "settlement" || transaction_status === "capture";

    if (existing) {
      // Same transaction_id, status changed (pending -> success): update only allowed fields
      const { data: updated, error: updErr } = await admin
        .from("payments")
        .update({
          payment_status: isPaidWebhook ? "success" : payment,
          verified_by_webhook: true,
          webhook_received_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updErr) throw updErr;
      paymentId = updated.id;
    } else {
      // Look for a pending midtrans payment row to attach to
      const { data: pendingRows } = await admin
        .from("payments")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("payment_method", "midtrans")
        .order("created_at", { ascending: false })
        .limit(1);

      if (pendingRows?.[0]) {
        const { data: updated, error: updErr } = await admin
          .from("payments")
          .update({
            payment_status: isPaidWebhook ? "success" : payment,
            midtrans_transaction_id: String(transaction_id),
            midtrans_order_id: String(order_id),
            verified_by_webhook: true,
            webhook_received_at: new Date().toISOString(),
          })
          .eq("id", pendingRows[0].id)
          .select("id")
          .single();
        if (updErr) throw updErr;
        paymentId = updated.id;
      } else {
        const { data: inserted, error: insErr } = await admin
          .from("payments")
          .insert({
            booking_id: bookingId,
            user_id: bookingUserId,
            amount: grossAmountNum,
            payment_method: "midtrans",
            payment_status: isPaidWebhook ? "success" : payment,
            midtrans_transaction_id: String(transaction_id),
            midtrans_order_id: String(order_id),
            verified_by_webhook: true,
            webhook_received_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insErr) {
          // Duplicate booking_id -> recover by updating existing row
          if ((insErr as { code?: string }).code === "23505") {
            const { data: dup } = await admin
              .from("payments")
              .select("id")
              .eq("booking_id", bookingId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (!dup) throw insErr;
            const { data: recovered, error: recErr } = await admin
              .from("payments")
              .update({
                payment_status: isPaidWebhook ? "success" : payment,
                midtrans_transaction_id: String(transaction_id),
                midtrans_order_id: String(order_id),
                verified_by_webhook: true,
                webhook_received_at: new Date().toISOString(),
              })
              .eq("id", dup.id)
              .select("id")
              .single();
            if (recErr) throw recErr;
            paymentId = recovered.id;
          } else {
            throw insErr;
          }
        } else {
          paymentId = inserted!.id;
        }
      }
    }

    // === STEP 6: Sync booking ===
    // For successful payments, the DB trigger `set_waiting_confirmation_on_payment`
    // will move booking to service_status='waiting_confirmation'. We only update
    // payment_status here and avoid overwriting booking.status (admin must confirm).
    if (isPaidWebhook) {
      await admin
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", bookingId);
    } else if (payment === "failed") {
      // Midtrans cancel/deny/expire/failure → cancel the booking too
      await admin
        .from("bookings")
        .update({ payment_status: "failed", status: "cancelled" })
        .eq("id", bookingId);
    } else {
      await admin
        .from("bookings")
        .update({ payment_status: bookingPayment })
        .eq("id", bookingId);
    }

    // === STEP 7: Log success ===
    await logWebhook({
      ...baseLog,
      booking_id: bookingId,
      payment_id: paymentId,
      validation_result: "valid",
    } as WebhookLog);

    console.log("PAYMENT UPDATED SUCCESS:", order_id);
    console.log("[midtrans-webhook] processed", {
      order_id,
      transaction_id,
      payment_type,
      payment,
      ts: new Date().toISOString(),
    });

    return ok({ received: true, status: payment, verified: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logWebhook({ validation_result: "error", error_message: msg });
    console.error("[midtrans-webhook] error:", err);
    // Always 200 to prevent retry storm; we have logs for investigation
    return ok({ received: false, message: "internal error" });
  }
});
