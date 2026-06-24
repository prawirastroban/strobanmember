import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── FCM helpers (mirror of dispatch-notification) ─────────────────────────
async function getFcmAccessToken(saJson: string): Promise<string> {
  let cleaned = (saJson || "").trim();
  if (cleaned.charCodeAt(0) === 0xfeff) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("```"))
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  const sa = JSON.parse(cleaned);
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pkBody = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pkBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${sigB64}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`FCM token error: ${JSON.stringify(j)}`);
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey);

    // Owner = 'staff' role (per project convention)
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isOwner = (roles ?? []).some((r: { role: string }) => r.role === "staff");
    if (!isOwner) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "stats";

    // ── STATS ────────────────────────────────────────────────────────────
    if (action === "stats") {
      const { data: tokens } = await admin
        .from("push_tokens")
        .select("platform, device_type, created_at, last_active")
        .is("invalidated_at", null);
      const arr = (tokens ?? []) as Array<{
        platform: string;
        device_type: string | null;
        created_at: string;
        last_active: string | null;
      }>;
      const counts = { total: arr.length, android: 0, ios: 0, web: 0 };
      for (const t of arr) {
        const p = (t.platform || "").toLowerCase();
        if (p === "android") counts.android++;
        else if (p === "ios") counts.ios++;
        else if (p === "web") counts.web++;
      }

      // last_sent: any "trigger" or "sent" event (broadcast attempt)
      const { data: lastSentRow } = await admin
        .from("push_delivery_logs")
        .select("created_at")
        .in("event_type", ["trigger", "sent"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: lastSuccessRow } = await admin
        .from("push_delivery_logs")
        .select("created_at")
        .eq("event_type", "sent")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: lastFailedRow } = await admin
        .from("push_delivery_logs")
        .select("created_at")
        .eq("event_type", "failed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return json({
        ok: true,
        counts,
        last_sent: lastSentRow?.created_at ?? null,
        last_success: lastSuccessRow?.created_at ?? null,
        last_failed: lastFailedRow?.created_at ?? null,
        fcm_configured: !!(Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") && Deno.env.get("FCM_PROJECT_ID")),
      });
    }

    // ── SEND TEST ────────────────────────────────────────────────────────
    if (action === "send_test") {
      const FCM_SA = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
      const FCM_PROJECT = Deno.env.get("FCM_PROJECT_ID");
      if (!FCM_SA || !FCM_PROJECT) {
        return json({ ok: false, error: "fcm_not_configured" }, 400);
      }

      const { data: tokens } = await admin
        .from("push_tokens")
        .select("user_id, token, platform")
        .is("invalidated_at", null);
      const list = (tokens ?? []) as Array<{ user_id: string; token: string; platform: string }>;
      if (list.length === 0) return json({ ok: true, sent: 0, failed: 0, total: 0 });

      const accessToken = await getFcmAccessToken(FCM_SA);
      const APP_ORIGIN =
        Deno.env.get("APP_PUBLIC_ORIGIN") || "https://bengkelstroban.com";
      const title = "Test Notification";
      const message = "Push notification test dari Owner Maintenance Center.";
      const toInvalidate: string[] = [];
      let sent = 0;
      let failed = 0;

      for (const t of list) {
        try {
          const r = await fetch(
            `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT}/messages:send`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token: t.token,
                  notification: { title, body: message },
                  data: { type: "test", route: "/", action_url: "/" },
                  android: {
                    priority: "HIGH",
                    notification: { color: "#ff2b2b", default_sound: true },
                  },
                  apns: {
                    headers: { "apns-priority": "10", "apns-push-type": "alert" },
                    payload: { aps: { alert: { title, body: message }, sound: "default" } },
                  },
                  webpush: {
                    headers: { Urgency: "high", TTL: "300" },
                    notification: {
                      title,
                      body: message,
                      icon: `${APP_ORIGIN}/pwa-192x192.png`,
                      badge: `${APP_ORIGIN}/pwa-192x192.png`,
                    },
                    fcm_options: { link: APP_ORIGIN + "/" },
                  },
                },
              }),
            },
          );
          const txt = await r.text();
          if (r.ok) sent++;
          else failed++;
          await admin.from("push_delivery_logs").insert({
            user_id: t.user_id,
            token: t.token,
            platform: t.platform,
            status_code: r.status,
            event_type: r.ok ? "sent" : "failed",
            detail: { source: "owner_test", response: txt.slice(0, 500) },
          });
          if (
            !r.ok &&
            (txt.includes("UNREGISTERED") ||
              txt.includes("INVALID_ARGUMENT") ||
              txt.includes("NOT_FOUND"))
          ) {
            toInvalidate.push(t.token);
          }
        } catch (e) {
          failed++;
          await admin.from("push_delivery_logs").insert({
            user_id: t.user_id,
            token: t.token,
            platform: t.platform,
            event_type: "failed",
            detail: { source: "owner_test", error: String((e as Error)?.message ?? e) },
          });
        }
      }

      if (toInvalidate.length) {
        await admin
          .from("push_tokens")
          .update({
            invalidated_at: new Date().toISOString(),
            invalid_reason: "fcm_unregistered",
          })
          .in("token", toInvalidate);
      }

      return json({ ok: true, total: list.length, sent, failed, pruned: toInvalidate.length });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("notification-audit error", e);
    return json({ error: (e as Error)?.message || String(e) }, 500);
  }
});