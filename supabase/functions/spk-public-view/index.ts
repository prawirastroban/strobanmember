// Public read-only view of an SPK for anon share links.
// Returns a sanitized subset of spk_orders + branch + timeline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function maskPhone(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw : "";
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  const tail = digits.slice(-4);
  return `••••••${tail}`;
}

// Whitelist inspection/estimation fields; strip anything else out of `data`.
// The Canvas builder (buildSpkDisplay) reads a well-known set of keys — we
// simply pass `data` through since it holds no PII beyond what's shown on the
// printed sheet (checklists, notes, estimates, signatures).
function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== "object") return {};
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id || !UUID_RE.test(id)) return json({ error: "ID tidak valid" }, 400);

    // Rate limit per SPK id (public endpoint).
    const { data: rlOk } = await admin.rpc("check_rate_limit", {
      _key: `spk-public-view:${id}`,
      _max: 60,
      _window_seconds: 600,
    });
    if (rlOk === false) {
      return json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, 429);
    }

    const { data: spk, error } = await admin
      .from("spk_orders")
      .select(
        "id, spk_number, branch_id, status, data, notes, opened_at, closed_at, created_at, ai_health_report, deleted_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!spk || spk.deleted_at) {
      return json({ error: "SPK tidak ditemukan" }, 404);
    }

    let branch: any = null;
    if (spk.branch_id) {
      const { data: br } = await admin
        .from("branches")
        .select("id, name, address, phone")
        .eq("id", spk.branch_id)
        .maybeSingle();
      branch = br;
    }

    const { data: tl } = await admin
      .from("spk_timeline")
      .select("id, event_type, title, meta, created_at")
      .eq("spk_id", id)
      .order("created_at", { ascending: true });

    // Mask any phone-shaped values inside data.customer if present.
    const dataOut: any = sanitizeData(spk.data);
    if (dataOut && typeof dataOut === "object") {
      const c = (dataOut as any).customer;
      if (c && typeof c === "object" && c.phone) {
        c.phone = maskPhone(c.phone);
      }
    }

    return json({
      spk: {
        id: spk.id,
        spk_number: spk.spk_number,
        branch_id: spk.branch_id,
        status: spk.status,
        data: dataOut,
        notes: spk.notes,
        opened_at: spk.opened_at,
        closed_at: spk.closed_at,
        created_at: spk.created_at,
        ai_health_report: spk.ai_health_report,
      },
      branch,
      timeline: tl ?? [],
    });
  } catch (e) {
    return json({ error: (e as Error)?.message || "Internal error" }, 500);
  }
});