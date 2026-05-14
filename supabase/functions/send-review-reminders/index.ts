import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FONNTE_URL = "https://api.fonnte.com/send";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  if (!p.startsWith("62")) return null;
  return p;
}

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
    if (req.method === "POST") {
      try {
        const body = await req.json();
        force = body?.force === true;
        dryRun = body?.dry_run === true;
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

    // Booking yang sudah due, belum di-dismiss, belum dikirim, belum ada review
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, customer_name, customer_phone, service_name, branch")
      .or("service_status.eq.completed,status.eq.completed")
      .eq("review_reminder_dismissed", false)
      .is("review_reminder_sent_at", null)
      .limit(50);

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

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true,
        targets: targets.map((b: any) => ({ id: b.id, name: b.customer_name, phone: b.customer_phone })),
        count: targets.length,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const b of targets as any[]) {
      const phone = normalizePhone(b.customer_phone || "");
      if (!phone) {
        results.push({ id: b.id, status: "skip_invalid_phone" });
        continue;
      }
      const message =
        `Halo ${b.customer_name} 👋\n\n` +
        `Terima kasih sudah menggunakan layanan *${b.service_name}* di *Sahabat Stroban Service*.\n\n` +
        `Bagaimana pengalaman Anda? Mohon tanggapan Anda dengan membalas pesan ini, atau hubungi kami di +628973700800.\n\n` +
        `Tanggapan Anda sangat membantu kami meningkatkan layanan 🙏`;

      try {
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
        } else {
          results.push({ id: b.id, status: "failed", error: JSON.stringify(j) });
        }
      } catch (e: any) {
        results.push({ id: b.id, status: "error", error: e?.message || String(e) });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    return new Response(JSON.stringify({ message: `Processed ${results.length}`, sent, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});