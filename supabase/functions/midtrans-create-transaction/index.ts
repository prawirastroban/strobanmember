import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
const IS_PRODUCTION = false; // sandbox
const SNAP_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!MIDTRANS_SERVER_KEY) {
      console.error("[midtrans-create] MIDTRANS_SERVER_KEY missing");
      return json({ error: "Server payment configuration missing. Hubungi admin." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    const { booking_id, amount, customer_name, customer_email, customer_phone, item_name } = body;
    if (!booking_id || !amount || amount <= 0) return json({ error: "Invalid input" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: booking, error: bErr } = await admin.from("bookings")
      .select("id, user_id, service_price, service_name").eq("id", booking_id).single();
    if (bErr || !booking) {
      console.error("[midtrans-create] booking fetch error", bErr);
      return json({ error: "Booking not found" }, 404);
    }
    if (booking.user_id !== user.id) return json({ error: "Booking not yours" }, 403);

    const orderId = `BK-${booking_id.slice(0, 8)}-${Date.now()}`;
    const grossAmount = Math.round(Number(amount));

    const phoneClean = String(customer_phone || "").replace(/\D/g, "").slice(0, 19);
    const payload = {
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      item_details: [{
        id: booking_id, price: grossAmount, quantity: 1,
        name: (item_name || booking.service_name || "Service").toString().substring(0, 50),
      }],
      customer_details: {
        first_name: (customer_name || "Customer").toString().substring(0, 50),
        email: (customer_email || user.email || "noreply@bengkelstroban.com").toString().substring(0, 50),
        phone: phoneClean || "0000000000",
      },
      credit_card: { secure: true },
    };

    const auth = btoa(`${MIDTRANS_SERVER_KEY}:`);
    let resp: Response;
    try {
      resp = await fetch(SNAP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchErr) {
      console.error("[midtrans-create] network error", fetchErr);
      return json({ error: "Tidak dapat terhubung ke Midtrans. Coba lagi." }, 502);
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.token) {
      console.error("[midtrans-create] midtrans rejected", { status: resp.status, data, payload });
      const detail = data?.error_messages?.join(", ") || data?.status_message || "Unknown error";
      return json({ error: `Midtrans: ${detail}`, details: data }, 502);
    }

    // Upsert payment record. Booking may already have a manual payment row
    // (pay_at_workshop / transfer / qris). Switch it to midtrans + new order id
    // so the webhook can match and update status correctly.
    const { data: existingPayment } = await admin
      .from("payments")
      .select("id, payment_status")
      .eq("booking_id", booking_id)
      .maybeSingle();

    if (existingPayment) {
      if (existingPayment.payment_status === "paid") {
        return json({ error: "Pembayaran sudah lunas." }, 409);
      }
      const { error: updErr } = await admin.from("payments")
        .update({
          amount: grossAmount,
          payment_method: "midtrans",
          payment_status: "pending",
          midtrans_order_id: orderId,
          verified_by_webhook: false,
        })
        .eq("id", existingPayment.id);
      if (updErr) {
        console.error("[midtrans-create] payment update error", updErr);
        return json({ error: "Gagal menyiapkan pembayaran" }, 500);
      }
    } else {
      const { error: insErr } = await admin.from("payments").insert({
        booking_id, user_id: user.id, amount: grossAmount,
        payment_method: "midtrans", payment_status: "pending",
        midtrans_order_id: orderId,
      });
      if (insErr) {
        console.error("[midtrans-create] payment insert error", insErr);
        return json({ error: "Gagal menyiapkan pembayaran" }, 500);
      }
    }

    // Reflect payment intent on booking
    await admin.from("bookings")
      .update({ payment_status: "awaiting_confirmation" })
      .eq("id", booking_id);

    console.log("[midtrans-create] success", { order_id: orderId, amount: grossAmount });

    return json({
      snap_token: data.token,
      redirect_url: data.redirect_url,
      order_id: orderId,
      client_key: Deno.env.get("MIDTRANS_CLIENT_KEY"),
      is_production: IS_PRODUCTION,
    });
  } catch (err) {
    console.error("[midtrans-create] unexpected", err);
    return json({ error: String(err?.message || err) }, 500);
  }
});
