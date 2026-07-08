import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actorId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify Owner role (DB enum 'staff')
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId)
      .eq("role", "staff")
      .maybeSingle();
    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Owner role required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const bookingId: string | undefined = body?.booking_id;
    const reason: string = (body?.reason || "").toString().trim();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (reason.length < 5) {
      return new Response(
        JSON.stringify({ error: "Reason must be at least 5 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Snapshot booking for audit log
    const { data: booking, error: getErr } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (getErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete dependents first (safe order)
    await admin.from("manual_payment_proofs").delete().eq("booking_id", bookingId);
    await admin.from("invoices").delete().eq("booking_id", bookingId);
    await admin.from("payments").delete().eq("booking_id", bookingId);
    await admin.from("booking_status_logs").delete().eq("booking_id", bookingId);
    await admin.from("booking_reviews").delete().eq("booking_id", bookingId);

    const { error: delErr } = await admin
      .from("bookings")
      .delete()
      .eq("id", bookingId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("admin_audit_log").insert({
      actor_id: actorId,
      actor_role: "staff",
      action: "booking.delete",
      target_type: "booking",
      target_id: bookingId,
      target_label: `${booking.customer_name} • ${booking.service_name}`,
      before: booking,
      after: null,
      ip: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
      metadata: { reason, branch: booking.branch },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
