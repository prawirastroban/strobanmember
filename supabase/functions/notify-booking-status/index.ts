import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FONNTE_URL = "https://api.fonnte.com/send";

interface Payload {
  booking_id: string;
  user_id: string;
  title: string;
  message: string;
  status_changed: boolean;
  payment_changed: boolean;
  new_status: string;
  new_payment_status: string;
}

function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  let s = p.replace(/\D/g, "");
  if (s.startsWith("0")) s = "62" + s.slice(1);
  else if (s.startsWith("8")) s = "62" + s;
  else if (s.startsWith("620")) s = "62" + s.slice(3);
  if (s.length < 10 || s.length > 15) return null;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    // Require authenticated staff/admin. Prevents anonymous attackers from
    // spamming WhatsApp and push notifications to arbitrary customers.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await callerClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const roleList = (roles || []).map((r: any) => r.role);
    const allowed = roleList.includes("admin") || roleList.includes("staff") || roleList.includes("admin_cabang");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body?.booking_id || !body?.user_id) {
      return new Response(JSON.stringify({ error: "Missing booking_id/user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking for phone & customer name
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_name, customer_phone, service_name, branch, public_track_token")
      .eq("id", body.booking_id)
      .maybeSingle();

    const trackingLink = booking?.public_track_token
      ? `https://www.bengkelstroban.com/t/${booking.public_track_token}`
      : `https://www.bengkelstroban.com/booking/status/${body.booking_id}`;
    const waMessage =
      `Halo ${booking?.customer_name || "Pelanggan"} 👋\n\n` +
      `*${body.title}*\n${body.message}\n\n` +
      (booking?.branch ? `Cabang: ${booking.branch}\n` : "") +
      `Lacak status (tanpa login): ${trackingLink}\n\n` +
      `— Sahabat Stroban Service`;

    const results: Record<string, unknown> = { wa: null, push: null };

    // ---- WhatsApp via Fonnte ----
    const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN");
    const phone = normalizePhone(booking?.customer_phone);
    if (FONNTE_TOKEN && phone) {
      try {
        const fd = new FormData();
        fd.append("target", phone);
        fd.append("message", waMessage);
        fd.append("countryCode", "62");
        const res = await fetch(FONNTE_URL, {
          method: "POST",
          headers: { Authorization: FONNTE_TOKEN },
          body: fd,
        });
        results.wa = { ok: res.ok, status: res.status };
      } catch (e: any) {
        results.wa = { error: e?.message || String(e) };
      }
    } else {
      results.wa = { skipped: true, reason: !FONNTE_TOKEN ? "no_token" : "no_phone" };
    }

    // ---- Native push intentionally skipped here ----
    // Push delivery is owned by the `dispatch-notification` function which is
    // fired by the DB trigger on `public.notifications` insert. Sending push
    // from here as well caused duplicate (2-3x) lock-screen notifications.
    results.push = { skipped: true, reason: "handled_by_dispatch_notification" };

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-booking-status error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- FCM OAuth ----
async function getFcmAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${enc(header)}.${enc(claims)}`;

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
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${unsigned}.${sigB64}`;

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await tokRes.json();
  if (!tokRes.ok) throw new Error(`FCM token error: ${JSON.stringify(j)}`);
  return j.access_token as string;
}