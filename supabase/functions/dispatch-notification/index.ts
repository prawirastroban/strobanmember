import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_ORIGIN = Deno.env.get("APP_PUBLIC_ORIGIN") || "https://bengkelstroban.com";

// Mirror of src/lib/notificationRoute.ts — keep in sync.
function resolveRoute(n: { type?: string | null; metadata?: any }, isStaffSide: boolean): string {
  if (n.metadata?.redirect_to) return String(n.metadata.redirect_to);
  const id = n.metadata?.reference_id;
  const type = n.type ?? "";
  if (isStaffSide) {
    if (type === "new_registration" && n.metadata?.registered_user_id)
      return `/dashboard/customers/${n.metadata.registered_user_id}`;
    if ((type === "booking" || type === "booking_created") && n.metadata?.customer_user_id)
      return `/dashboard/customers/${n.metadata.customer_user_id}`;
    if (type === "booking" || type === "booking_created") return "/dashboard/bookings";
    if (type === "new_registration") return "/dashboard/customers";
    if (type === "cancel_request") return "/dashboard/bookings";
    if (type === "tire_order") return "/dashboard/bookings";
    if (type === "payment") return "/dashboard/payments";
    if (type === "referral") return "/dashboard/users";
    if (type === "promo_used") return "/dashboard/marketing/promos";
    if (type === "reward_used") return "/dashboard/marketing";
    if (type === "bug_report") return "/dashboard/feedback";
  }
  switch (type) {
    case "payment_success":
    case "payment": return "/profile/history-perawatan";
    case "booking_created":
    case "booking": return "/profile/history-perawatan";
    case "invoice_ready": return id ? `/invoice/${id}` : "/profile/history-perawatan";
    case "cancel_rejected":
    case "cancel_request": return "/profile/history-perawatan";
    case "tire_order": return "/profile/history-perawatan";
    case "referral": return "/referral";
    case "promo_used": return "/promo";
    case "reward_used": return "/loyalty";
    case "referral_commission": return "/referral";
    case "new_registration": return "/dashboard/customers";
    case "service_progress": return "/";
    case "verification": return "/";
    default: return "/";
  }
}

async function getFcmAccessToken(saJson: string): Promise<string> {
  // Tolerate accidental wrapping (BOM, surrounding quotes, fenced JSON, stray
  // whitespace) when the secret value was pasted from a copy with extra chars.
  let cleaned = (saJson || "").trim();
  if (cleaned.charCodeAt(0) === 0xfeff) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  let sa: any;
  try {
    sa = JSON.parse(cleaned);
  } catch (e: any) {
    throw new Error(
      `bad_fcm_credentials: FCM_SERVICE_ACCOUNT_JSON is not valid JSON (${e?.message || e}). ` +
      `Re-paste the full service-account file from Firebase Console → Project Settings → Service accounts.`,
    );
  }
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const notificationId: string | undefined = body?.notification_id;
    if (!notificationId) {
      return new Response(JSON.stringify({ error: "missing notification_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: notif, error: nErr } = await admin
      .from("notifications")
      .select("id, user_id, title, message, type, metadata, priority, action_url")
      .eq("id", notificationId)
      .maybeSingle();

    if (nErr || !notif) {
      return new Response(JSON.stringify({ error: "notification not found", details: nErr?.message }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if recipient is staff/admin
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", notif.user_id);
    const isStaffSide = (roles ?? []).some((r: any) =>
      ["admin", "staff", "admin_cabang"].includes(r.role),
    );

    const route = resolveRoute(notif as any, isStaffSide);
    const targetRoute = (notif as any).action_url || route;
    const link = `${APP_ORIGIN}${route}`;
    const finalRoute = (notif as any).action_url || route;
    const finalLink = `${APP_ORIGIN}${finalRoute}`;
    const groupKey: string = String((notif as any).metadata?.group_key || (notif as any).type || "general");
    const subtitle: string | undefined = (notif as any).metadata?.branch
      ? `Cabang ${String((notif as any).metadata.branch).replace(/\b\w/g, (c: string) => c.toUpperCase())}`
      : undefined;

    // ── Smart delivery ──────────────────────────────────────────────────────
    // If the user has at least one active session whose current_route already
    // starts with the notification's target route, skip the push notification.
    // Critical priority bypasses this rule (always push).
    const priority = String((notif as any).priority || "medium");
    let skipPushDueToPresence = false;
    const isTestNotif = String(notif.type ?? "") === "verification";
    if (priority !== "critical" && !isTestNotif && targetRoute && targetRoute !== "/") {
      try {
        const thirtySecAgo = new Date(Date.now() - 30_000).toISOString();
        const { data: presence } = await admin
          .from("user_presence")
          .select("current_route, last_seen")
          .eq("user_id", notif.user_id)
          .gte("last_seen", thirtySecAgo);
        if (presence && presence.length > 0) {
          skipPushDueToPresence = (presence as any[]).some(
            (p) => typeof p.current_route === "string" && p.current_route.startsWith(targetRoute),
          );
        }
      } catch (_) { /* ignore — fall back to sending push */ }
    }

    if (skipPushDueToPresence) {
      await admin.from("push_delivery_logs").insert({
        notification_id: notif.id,
        user_id: notif.user_id,
        event_type: "skipped",
        detail: { reason: "user_viewing_target", route: targetRoute },
      });
      return new Response(JSON.stringify({
        ok: true, skipped: true, reason: "user_viewing_target", route: targetRoute,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", notif.user_id);

    // Compute current unread count so badge stays in sync on iOS PWA / Chrome PWA.
    let unreadCount = 0;
    try {
      const { count } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", notif.user_id)
        .eq("is_read", false);
      unreadCount = count ?? 0;
    } catch (_) { /* ignore */ }

    const FCM_SA = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    const FCM_PROJECT = Deno.env.get("FCM_PROJECT_ID");

    if (!FCM_SA || !FCM_PROJECT) {
      await admin.from("push_delivery_logs").insert({
        notification_id: notif.id,
        user_id: notif.user_id,
        event_type: "skipped",
        detail: { reason: "no_fcm_credentials", route, tokens: tokens?.length || 0 },
      });
      return new Response(JSON.stringify({
        ok: true, skipped: true, reason: "no_fcm_credentials", route, tokens: tokens?.length || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!tokens || tokens.length === 0) {
      await admin.from("push_delivery_logs").insert({
        notification_id: notif.id,
        user_id: notif.user_id,
        event_type: "skipped",
        detail: { reason: "no_tokens", route },
      });
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_tokens", route }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("push_delivery_logs").insert({
      notification_id: notif.id,
      user_id: notif.user_id,
      event_type: "trigger",
      detail: { route, unread_count: unreadCount, token_count: tokens.length },
    });

    const accessToken = await getFcmAccessToken(FCM_SA);
    const results: any[] = [];
    const toDelete: string[] = [];

    for (const t of tokens) {
      try {
        const isHighOrCritical = priority === "high" || priority === "critical";
        const isTimeSensitive = groupKey === "booking" || groupKey === "payment" || groupKey === "status_change";
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
                notification: { title: notif.title, body: notif.message },
                data: {
                  type: String(notif.type ?? ""),
                  notification_id: String(notif.id),
                  reference_id: String(notif.metadata?.reference_id ?? ""),
                  route: finalRoute,
                  action_url: finalRoute,
                  group_key: groupKey,
                  badge_count: String(unreadCount),
                },
                android: {
                  priority: isHighOrCritical ? "HIGH" : "NORMAL",
                  notification: {
                    click_action: finalLink,
                    tag: groupKey,
                    color: "#ff2b2b",
                    notification_priority: isHighOrCritical ? "PRIORITY_HIGH" : "PRIORITY_DEFAULT",
                    default_sound: true,
                    default_vibrate_timings: true,
                    visibility: "PUBLIC",
                    channel_id: groupKey,
                  },
                },
                apns: {
                  headers: {
                    "apns-priority": isHighOrCritical ? "10" : "5",
                    "apns-push-type": "alert",
                  },
                  payload: {
                    aps: {
                      alert: { title: notif.title, body: notif.message, ...(subtitle ? { subtitle } : {}) },
                      sound: "default",
                      badge: unreadCount,
                      "mutable-content": 1,
                      "thread-id": groupKey,
                      ...(isTimeSensitive ? { "interruption-level": "time-sensitive" } : {}),
                    },
                  },
                },
                webpush: {
                  headers: { Urgency: isHighOrCritical ? "high" : "normal", TTL: "86400" },
                  notification: {
                    title: notif.title,
                    body: notif.message,
                    icon: `${APP_ORIGIN}/pwa-192x192.png`,
                    badge: `${APP_ORIGIN}/pwa-192x192.png`,
                    tag: groupKey,
                    renotify: true,
                    requireInteraction: isHighOrCritical,
                    actions: [
                      { action: "open", title: "Lihat" },
                      { action: "dismiss", title: "Tutup" },
                    ],
                  },
                  fcm_options: { link: finalLink },
                },
              },
            }),
          },
        );
        const txt = await r.text();
        results.push({ ok: r.ok, status: r.status, platform: t.platform });
        await admin.from("push_delivery_logs").insert({
          notification_id: notif.id,
          user_id: notif.user_id,
          token: t.token,
          platform: t.platform,
          status_code: r.status,
          event_type: r.ok ? "sent" : "failed",
          detail: { route: finalRoute, group_key: groupKey, response: txt.slice(0, 1000) },
        });
        if (!r.ok && (txt.includes("UNREGISTERED") || txt.includes("INVALID_ARGUMENT") || txt.includes("NOT_FOUND"))) {
          toDelete.push(t.token);
        }
      } catch (e: any) {
        results.push({ ok: false, error: e?.message || String(e), platform: t.platform });
        await admin.from("push_delivery_logs").insert({
          notification_id: notif.id,
          user_id: notif.user_id,
          token: t.token,
          platform: t.platform,
          event_type: "failed",
          detail: { route, error: e?.message || String(e) },
        });
      }
    }

    if (toDelete.length) {
      await admin.from("push_tokens").update({ invalidated_at: new Date().toISOString(), invalid_reason: "fcm_unregistered" }).in("token", toDelete);
    }

    return new Response(JSON.stringify({
      ok: true, route, sent: results.length, results, pruned: toDelete.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("dispatch-notification error", e);
    try {
      const url = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(url, serviceKey);
      const body = await req.clone().json().catch(() => ({} as any));
      if (body?.notification_id) {
        await admin.from("push_delivery_logs").insert({
          notification_id: body.notification_id,
          event_type: "failed",
          detail: { reason: String(e?.message || e).slice(0, 500) },
        });
      }
    } catch (_) { /* best-effort */ }
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});