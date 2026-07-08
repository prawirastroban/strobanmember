import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;

async function sha512(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isStaffOrAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "staff");
    if (!isStaffOrAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, transaction_status = "capture", fraud_status = "accept" } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up payment to derive gross_amount
    const { data: payment } = await admin
      .from("payments")
      .select("amount")
      .eq("midtrans_order_id", String(order_id))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const amount = payment?.amount ?? 10000;
    const gross = `${Number(amount).toFixed(2)}`;
    const status_code = "200";
    const transaction_id = `sim-${Date.now()}`;
    const signature_key = await sha512(`${order_id}${status_code}${gross}${MIDTRANS_SERVER_KEY}`);

    const payload = {
      transaction_time: new Date().toISOString(),
      transaction_status,
      transaction_id,
      status_message: "midtrans payment notification",
      status_code,
      signature_key,
      payment_type: "credit_card",
      order_id,
      merchant_id: "M001",
      gross_amount: gross,
      fraud_status,
      currency: "IDR",
    };

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/midtrans-webhook`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();

    return new Response(JSON.stringify({
      forwarded: true,
      webhook_status: r.status,
      webhook_response: text,
      payload_sent: payload,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("simulate-webhook error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});