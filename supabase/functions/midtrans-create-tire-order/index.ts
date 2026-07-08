import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
const SNAP_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!MIDTRANS_SERVER_KEY) return json({ error: "Server payment misconfigured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body?.order_id) return json({ error: "Invalid input" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error: oErr } = await admin.from("tire_orders")
      .select("*").eq("id", body.order_id).single();
    if (oErr || !order) return json({ error: "Order not found" }, 404);
    if (order.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const orderId = `TIRE-${order.order_number}-${Date.now()}`;
    const grossAmount = Math.round(Number(order.total_amount));
    const phoneClean = String(order.customer_phone || "").replace(/\D/g, "").slice(0, 19);

    const items = (Array.isArray(order.items) ? order.items : []).map((it: { tire_id: string; brand: string; type: string; size: string; quantity: number; unit_price: number }) => ({
      id: it.tire_id, price: Math.round(Number(it.unit_price)), quantity: it.quantity,
      name: `${it.brand} ${it.type} ${it.size}`.substring(0, 50),
    }));
    if (Number(order.installation_fee) > 0) {
      items.push({ id: "INSTALL", price: Math.round(Number(order.installation_fee)), quantity: 1, name: "Biaya Pemasangan" });
    }

    const payload = {
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      item_details: items,
      customer_details: {
        first_name: String(order.customer_name).substring(0, 50),
        email: String(order.customer_email).substring(0, 50),
        phone: phoneClean || "0000000000",
      },
      credit_card: { secure: true },
    };

    const auth = btoa(`${MIDTRANS_SERVER_KEY}:`);
    const resp = await fetch(SNAP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.token) {
      console.error("[midtrans-tire] rejected", { status: resp.status, data });
      return json({ error: data?.error_messages?.join(", ") || "Midtrans error" }, 502);
    }

    await admin.from("tire_orders").update({
      midtrans_order_id: orderId, payment_status: "pending", payment_method: "midtrans",
    }).eq("id", order.id);

    return json({
      snap_token: data.token,
      redirect_url: data.redirect_url,
      order_id: orderId,
      client_key: Deno.env.get("MIDTRANS_CLIENT_KEY"),
    });
  } catch (err) {
    console.error("[midtrans-tire] unexpected", err);
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});