import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
const IS_PRODUCTION = false;
const STATUS_API_BASE = IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

type PaymentStatus = "success" | "pending" | "failed";

function mapStatus(transaction_status: string, fraud_status?: string | null) {
  let payment: PaymentStatus = "pending";
  if (transaction_status === "capture") {
    payment = fraud_status === "accept" ? "success" : "pending";
  } else if (transaction_status === "settlement") {
    payment = "success";
  } else if (["cancel", "deny", "expire", "failure"].includes(transaction_status)) {
    payment = "failed";
  }

  return {
    payment,
    bookingStatus: payment === "success" ? "confirmed" : "pending",
    bookingPaymentStatus: payment === "success"
      ? "paid"
      : payment === "failed"
        ? "failed"
        : "pending_payment",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roles, error: roleError } = await admin.from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) throw roleError;

    const isStaffOrAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "staff");
    if (!isStaffOrAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pendingPayments, error: fetchError } = await admin
      .from("payments")
      .select("id, booking_id, user_id, amount, payment_method, midtrans_order_id, verified_by_webhook")
      .in("payment_method", ["midtrans", "midtrans_test"])
      .eq("payment_status", "pending")
      .limit(100);

    if (fetchError) throw fetchError;

    const auth = btoa(`${MIDTRANS_SERVER_KEY}:`);
    const results = [] as Array<Record<string, string | boolean | null>>;

    for (const row of pendingPayments ?? []) {
      if (!row.midtrans_order_id) {
        results.push({ payment_id: row.id, order_id: null, recovered: false, message: "missing order id" });
        continue;
      }

      const response = await fetch(`${STATUS_API_BASE}/${encodeURIComponent(row.midtrans_order_id)}/status`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Basic ${auth}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.transaction_status) {
        results.push({ payment_id: row.id, order_id: row.midtrans_order_id, recovered: false, message: "status lookup failed" });
        continue;
      }

      const mapped = mapStatus(payload.transaction_status, payload.fraud_status ?? null);
      if (mapped.payment === "pending") {
        results.push({ payment_id: row.id, order_id: row.midtrans_order_id, recovered: false, message: `status=${payload.transaction_status}` });
        continue;
      }

      // === Failed (cancel/deny/expire/failure) → mark payment failed + cancel booking
      if (mapped.payment === "failed") {
        const nowFail = new Date().toISOString();
        const { error: payErr } = await admin
          .from("payments")
          .update({
            payment_status: "failed",
            verified_by_webhook: true,
            webhook_received_at: nowFail,
            midtrans_transaction_id: payload.transaction_id ? String(payload.transaction_id) : null,
          })
          .eq("id", row.id);
        if (payErr) throw payErr;

        await admin
          .from("bookings")
          .update({ payment_status: "failed", status: "cancelled" })
          .eq("id", row.booking_id);

        await admin.from("webhook_logs").insert({
          source: "midtrans",
          order_id: row.midtrans_order_id,
          transaction_id: payload.transaction_id ? String(payload.transaction_id) : null,
          transaction_status: String(payload.transaction_status),
          fraud_status: payload.fraud_status ? String(payload.fraud_status) : null,
          payment_type: payload.payment_type ? String(payload.payment_type) : null,
          gross_amount: payload.gross_amount ? Number(payload.gross_amount) : Number(row.amount),
          validation_result: "recovered_failed",
          booking_id: row.booking_id,
          payment_id: row.id,
          raw_payload: payload,
        });

        results.push({ payment_id: row.id, order_id: row.midtrans_order_id, recovered: true, message: `cancelled (${payload.transaction_status})` });
        continue;
      }

      if (payload.transaction_id) {
        const { data: duplicate } = await admin
          .from("payments")
          .select("id")
          .eq("midtrans_transaction_id", String(payload.transaction_id))
          .neq("id", row.id)
          .maybeSingle();

        if (duplicate) {
          results.push({ payment_id: row.id, order_id: row.midtrans_order_id, recovered: false, message: "duplicate transaction id" });
          continue;
        }
      }

      const now = new Date().toISOString();
      const { error: paymentError } = await admin
        .from("payments")
        .update({
          payment_status: "success",
          midtrans_transaction_id: String(payload.transaction_id ?? ""),
          verified_by_webhook: true,
          webhook_received_at: now,
        })
        .eq("id", row.id);

      if (paymentError) throw paymentError;

      const { error: bookingError } = await admin
        .from("bookings")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("id", row.booking_id);

      if (bookingError) throw bookingError;

      await admin.from("webhook_logs").insert({
        source: "midtrans",
        order_id: row.midtrans_order_id,
        transaction_id: payload.transaction_id ? String(payload.transaction_id) : null,
        transaction_status: String(payload.transaction_status),
        fraud_status: payload.fraud_status ? String(payload.fraud_status) : null,
        payment_type: payload.payment_type ? String(payload.payment_type) : null,
        gross_amount: payload.gross_amount ? Number(payload.gross_amount) : Number(row.amount),
        validation_result: "recovered",
        booking_id: row.booking_id,
        payment_id: row.id,
        raw_payload: payload,
      });

      results.push({ payment_id: row.id, order_id: row.midtrans_order_id, recovered: true, message: "updated to success" });
    }

    return new Response(JSON.stringify({ recovered_count: results.filter((r) => r.recovered).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[midtrans-recover-pending] error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});