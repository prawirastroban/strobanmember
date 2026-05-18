import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      return json({ error: "Unauthorized" }, 401);
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
      return json({ error: "Forbidden: Owner role required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const auditLogId: string | undefined = body?.audit_log_id;
    if (!auditLogId) {
      return json({ error: "audit_log_id required" }, 400);
    }

    const { data: auditRow, error: auditErr } = await admin
      .from("admin_audit_log")
      .select("id, action, before, target_id")
      .eq("id", auditLogId)
      .maybeSingle();
    if (auditErr || !auditRow) {
      return json({ error: "Audit log not found" }, 404);
    }
    if (auditRow.action !== "booking.delete") {
      return json({ error: "Audit entry is not a booking deletion" }, 400);
    }
    const snap = auditRow.before as Record<string, any> | null;
    if (!snap || !snap.id) {
      return json({ error: "Snapshot is missing or invalid" }, 400);
    }

    // Idempotent: if booking already exists, do not overwrite
    const { data: existing } = await admin
      .from("bookings")
      .select("id")
      .eq("id", snap.id)
      .maybeSingle();
    if (existing) {
      return json({ error: "Transaksi sudah dipulihkan sebelumnya" }, 409);
    }

    // Re-insert booking from snapshot, with safe overrides
    const restorePayload = {
      ...snap,
      status: "cancelled",
      payment_status: "unpaid",
      updated_at: new Date().toISOString(),
    };

    const { error: insErr } = await admin
      .from("bookings")
      .insert(restorePayload);
    if (insErr) {
      return json({ error: insErr.message }, 500);
    }

    await admin.from("admin_audit_log").insert({
      actor_id: actorId,
      actor_role: "staff",
      action: "booking.restore",
      target_type: "booking",
      target_id: snap.id,
      target_label: `${snap.customer_name ?? ""} • ${snap.service_name ?? ""}`,
      before: null,
      after: restorePayload,
      ip: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
      metadata: { restored_from_audit_id: auditLogId, branch: snap.branch },
    });

    return json({ success: true, booking_id: snap.id });
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});