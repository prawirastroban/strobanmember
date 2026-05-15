import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FONNTE_URL = "https://api.fonnte.com/send";
const PUBLIC_REVIEW_BASE = "https://www.bengkelstroban.com/review";

function genToken(): string {
  // 16 chars URL-safe
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  if (!p.startsWith("62")) return null;
  // WhatsApp/Indonesian mobile: 62 + 8xxxxxxxx (total 11-15 digits)
  if (p.length < 11 || p.length > 15) return null;
  if (!p.startsWith("628")) return null;
  // Reject obvious dummy numbers (all same digit after 62)
  const tail = p.slice(2);
  if (/^(\d)\1+$/.test(tail)) return null;
  if (tail.startsWith("000") || tail.startsWith("8000000")) return null;
  return p;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN");
    const CRON_SECRET = Deno.env.get("CRON_SECRET");

    // Parse optional body params
    let force = false;
    let dryRun = false;
    let limit = 10; // safety cap per execution
    let throttleMs = 1500; // delay between sends to avoid Fonnte anti-spam
    let bookingIds: string[] | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        force = body?.force === true;
        dryRun = body?.dry_run === true;
        if (typeof body?.limit === "number" && body.limit > 0) limit = Math.min(body.limit, 50);
        if (typeof body?.throttle_ms === "number" && body.throttle_ms >= 0) throttleMs = Math.min(body.throttle_ms, 10000);
        if (Array.isArray(body?.booking_ids) && body.booking_ids.length > 0) {
          bookingIds = body.booking_ids.filter((x: any) => typeof x === "string").slice(0, 50);
        }
      } catch { /* no body */ }
    }

    // Auth: cron secret OR admin/staff
    const cronHeader = req.headers.get("X-Cron-Secret");
    const authHeader = req.headers.get("Authorization");
    let authorized = false;
    let isCron = false;

    if (cronHeader && CRON_SECRET && cronHeader === CRON_SECRET) {
      authorized = true;
      isCron = true;
    } else if (authHeader) {
      const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin","staff"]);
        if (roles && roles.length) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!FONNTE_TOKEN) {
      return new Response(JSON.stringify({ error: "FONNTE_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check schedule gating (skip for force or admin manual test)
    if (!force) {
      const { data: setting } = await supabase
        .from("app_settings").select("value").eq("key", "review_reminder_schedule").maybeSingle();
      const cfg = (setting?.value || {}) as { enabled?: boolean; hour?: number; minute?: number };
      if (!cfg.enabled) {
        return new Response(JSON.stringify({ skipped: true, reason: "schedule_disabled" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (isCron) {
        // Match WIB (UTC+7) hour/minute window (±1 minute tolerance for cron drift)
        const now = new Date();
        const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const h = wib.getUTCHours();
        const m = wib.getUTCMinutes();
        const targetH = cfg.hour ?? 10;
        const targetM = cfg.minute ?? 0;
        const matches = h === targetH && Math.abs(m - targetM) <= 1;
        if (!matches) {
          return new Response(JSON.stringify({ skipped: true, reason: "not_scheduled_time", now: `${h}:${m}`, target: `${targetH}:${targetM}` }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Booking yang sudah due, belum di-dismiss, belum dikirim, belum ada review.
    // Jika dipanggil dengan booking_ids (admin manual single send), bypass filter sent_at & dismissed.
    let query = supabase
      .from("bookings")
      .select("id, customer_name, customer_phone, service_name, branch, review_submission_token");
    if (bookingIds && bookingIds.length > 0) {
      query = query.in("id", bookingIds);
    } else {
      query = query
        .or("service_status.eq.completed,status.eq.completed")
        .eq("review_reminder_dismissed", false)
        .is("review_reminder_sent_at", null)
        .limit(50);
    }
    const { data: bookings, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders due", sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exclude yang sudah ada review
    const ids = bookings.map((b: any) => b.id);
    const { data: reviewed } = await supabase
      .from("booking_reviews").select("booking_id").in("booking_id", ids);
    const reviewedSet = new Set((reviewed || []).map((r: any) => r.booking_id));
    const targets = bookings.filter((b: any) => !reviewedSet.has(b.id));

    // Load template
    const { data: tplSetting } = await supabase
      .from("app_settings").select("value").eq("key", "review_reminder_template").maybeSingle();
    const tplCfg = (tplSetting?.value || {}) as { message?: string; include_link?: boolean };
    const defaultTpl = `Halo {name} 👋\n\nTerima kasih sudah menggunakan layanan *{service}* di *Sahabat Stroban Service*.\n\nMohon luangkan waktu sebentar untuk memberi rating & tanggapan Anda di link berikut:\n{link}\n\nTanggapan Anda sangat berarti bagi kami 🙏`;
    const messageTpl = tplCfg.message || defaultTpl;

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true,
        targets: targets.map((b: any) => ({
          id: b.id, name: b.customer_name, phone: b.customer_phone,
          normalized: normalizePhone(b.customer_phone || ""),
        })),
        count: targets.length,
        valid_count: targets.filter((b: any) => normalizePhone(b.customer_phone || "")).length,
        will_send_in_next_run: Math.min(limit, targets.filter((b: any) => normalizePhone(b.customer_phone || "")).length),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];
    let sentCount = 0;
    let consecutiveFailures = 0;

    for (const b of targets as any[]) {
      if (sentCount >= limit) {
        results.push({ id: b.id, status: "skip_limit_reached" });
        continue;
      }
      // Circuit breaker: stop after 3 consecutive Fonnte failures (likely device blocked)
      if (consecutiveFailures >= 3) {
        results.push({ id: b.id, status: "skip_circuit_open", error: "stopped after consecutive failures (likely Fonnte device issue)" });
        continue;
      }
      const phone = normalizePhone(b.customer_phone || "");
      if (!phone) {
        results.push({ id: b.id, status: "skip_invalid_phone" });
        continue;
      }

      // Ensure token exists for this booking
      let token = b.review_submission_token as string | null;
      if (!token) {
        token = genToken();
        await supabase.from("bookings").update({ review_submission_token: token }).eq("id", b.id);
      }
      const link = `${PUBLIC_REVIEW_BASE}/${token}`;
      const message = renderTemplate(messageTpl, {
        name: b.customer_name || "",
        service: b.service_name || "",
        branch: b.branch || "",
        link,
      });

      try {
        // throttle to avoid anti-spam blocks
        if (sentCount > 0 && throttleMs > 0) await sleep(throttleMs);

        const fd = new FormData();
        fd.append("target", phone);
        fd.append("message", message);
        fd.append("countryCode", "62");

        const res = await fetch(FONNTE_URL, {
          method: "POST",
          headers: { Authorization: FONNTE_TOKEN },
          body: fd,
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && (j.status === true || j.status === "true")) {
          await supabase.from("bookings").update({ review_reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
          await supabase.from("activity_logs").insert({
            type: "review",
            description: `WA review reminder sent to ${b.customer_name}`,
            metadata: { booking_id: b.id, phone, provider: "fonnte" },
          });
          results.push({ id: b.id, status: "sent" });
          sentCount++;
          consecutiveFailures = 0;
        } else {
          const reason = j?.reason || j?.message || JSON.stringify(j);
          results.push({ id: b.id, status: "failed", error: String(reason).slice(0, 200) });
          consecutiveFailures++;
        }
      } catch (e: any) {
        results.push({ id: b.id, status: "error", error: e?.message || String(e) });
        consecutiveFailures++;
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed" || r.status === "error").length;
    const skipped = results.filter((r) => r.status.startsWith("skip_")).length;
    const circuitOpen = consecutiveFailures >= 3;
    return new Response(JSON.stringify({
      message: `Processed ${results.length}`,
      sent, failed, skipped,
      circuit_open: circuitOpen,
      hint: circuitOpen ? "Pengiriman dihentikan otomatis karena beberapa kegagalan beruntun. Cek dashboard Fonnte: device mungkin di-block atau token tidak valid." : undefined,
      results,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});