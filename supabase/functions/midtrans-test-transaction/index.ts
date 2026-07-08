import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
const IS_PRODUCTION = false;
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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin or staff
    const { data: roles } = await admin.from("user_roles")
      .select("role").eq("user_id", user.id);
    const isStaffOrAdmin = (roles ?? []).some(r => r.role === "admin" || r.role === "staff");
    if (!isStaffOrAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: staff/admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ts = Date.now();
    const amount = 10000;
    const today = new Date().toISOString().slice(0, 10);

    // Create dummy booking
    const { data: booking, error: bookingErr } = await admin.from("bookings").insert({
      user_id: user.id,
      created_by: user.id,
      booking_source: "self_booking",
      service_name: "Test Service",
      service_type: "test",
      service_price: amount,
      service_duration: 30,
      booking_date: today,
      booking_time: "10:00",
      customer_name: user.user_metadata?.full_name || "Test User",
      customer_email: user.email || "test@example.com",
      customer_phone: "0000000000",
      car_plate_number: "TEST-1234",
      car_type: "Dummy Car",
      branch: "Test Branch",
      status: "pending",
      payment_status: "pending_payment",
    }).select("id").single();

    if (bookingErr || !booking) {
      console.error("Booking insert error:", bookingErr);
      return new Response(JSON.stringify({ error: "Failed to create test booking", details: bookingErr }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = `TEST-${ts}`;

    const payload = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [{ id: booking.id, price: amount, quantity: 1, name: "Test Service" }],
      customer_details: {
        first_name: user.user_metadata?.full_name || "Test User",
        email: user.email || "test@example.com",
        phone: "0000000000",
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

    // Pending payment row tagged as test and linked to Midtrans order id for webhook matching
    await admin.from("payments").insert({
      booking_id: booking.id,
      user_id: user.id,
      amount,
      payment_method: "midtrans_test",
      payment_status: "pending",
      midtrans_order_id: orderId,
    });

    // Activity log for tracking
    await admin.from("activity_logs").insert({
      type: "payment",
      description: `Test Midtrans transaction created: ${orderId}`,
      user_id: user.id,
      metadata: { order_id: orderId, booking_id: booking.id, amount, test: true },
    });

    console.log(`[TEST PAYMENT] Created order_id=${orderId} booking=${booking.id}`);

    return new Response(JSON.stringify({
      snap_token: data.token,
      redirect_url: data.redirect_url,
      order_id: orderId,
      booking_id: booking.id,
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
