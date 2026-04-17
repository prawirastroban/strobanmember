import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
const IS_PRODUCTION = false; // sandbox
const SNAP_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { booking_id, amount, customer_name, customer_email, customer_phone, item_name } = body;

    if (!booking_id || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify booking belongs to user
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: booking } = await admin.from("bookings")
      .select("id, user_id, service_price, service_name").eq("id", booking_id).single();
    if (!booking || booking.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = `BK-${booking_id.slice(0, 8)}-${Date.now()}`;
    const grossAmount = Math.round(Number(amount));

    const payload = {
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      item_details: [{
        id: booking_id, price: grossAmount, quantity: 1,
        name: (item_name || booking.service_name || "Service").substring(0, 50),
      }],
      customer_details: {
        first_name: customer_name || "Customer",
        email: customer_email || user.email,
        phone: customer_phone || "",
      },
      credit_card: { secure: true },
    };

    const auth = btoa(`${MIDTRANS_SERVER_KEY}:`);
    const resp = await fetch(SNAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Midtrans error:", data);
      return new Response(JSON.stringify({ error: "Midtrans error", details: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create pending payment record (with order_id for webhook matching)
    await admin.from("payments").insert({
      booking_id, user_id: user.id, amount: grossAmount,
      payment_method: "midtrans", payment_status: "pending",
      midtrans_order_id: orderId,
    });

    return new Response(JSON.stringify({
      snap_token: data.token,
      redirect_url: data.redirect_url,
      order_id: orderId,
      client_key: Deno.env.get("MIDTRANS_CLIENT_KEY"),
      is_production: IS_PRODUCTION,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
