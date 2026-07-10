// SPK AI Vehicle Health Analysis
// Reads SPK data (inspection, complaint, mileage), asks Lovable AI Gateway
// for a structured health report, writes it back to spk_orders.ai_health_report.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type HealthReport = {
  overall_status: "Excellent" | "Good" | "Needs Attention" | "Critical";
  score: number;
  summary: string;
  findings: string[];
  recommendations: string[];
  next_service_km?: number | null;
  generated_at: string;
};

function deterministicFallback(d: Record<string, unknown>): HealthReport {
  // Count negative inspection markers (NOT_OK flags) if present in data.
  const flat = JSON.stringify(d ?? {}).toLowerCase();
  const notOkCount = (flat.match(/"not_ok"/g) ?? []).length + (flat.match(/"critical"/g) ?? []).length;
  let status: HealthReport["overall_status"] = "Good";
  let score = 82;
  if (notOkCount >= 4) { status = "Critical"; score = 45; }
  else if (notOkCount >= 2) { status = "Needs Attention"; score = 65; }
  else if (notOkCount === 0) { status = "Excellent"; score = 92; }
  const km = Number((d as any)?.vehicle_mileage_now) || 0;
  return {
    overall_status: status,
    score,
    summary: "Ringkasan otomatis berdasarkan data inspeksi. Analisis AI tidak tersedia saat ini.",
    findings: notOkCount ? [`Terdapat ${notOkCount} item inspeksi bertanda perhatian.`] : ["Tidak ada temuan kritis dari inspeksi."],
    recommendations: ["Ikuti jadwal servis berkala.", "Pantau tekanan ban dan level cairan secara rutin."],
    next_service_km: km ? km + 5000 : null,
    generated_at: new Date().toISOString(),
  };
}

async function aiAnalyze(spk: any): Promise<HealthReport> {
  if (!LOVABLE_API_KEY) return deterministicFallback(spk.data ?? {});

  const prompt = `Kamu adalah teknisi otomotif senior. Analisis kesehatan kendaraan berikut berdasarkan Surat Perintah Kerja (SPK).

SPK: ${spk.spk_number}
Data: ${JSON.stringify(spk.data ?? {}, null, 2)}
Notes: ${spk.notes ?? "-"}

Berikan analisis dalam bahasa Indonesia sebagai JSON valid dengan kunci: overall_status (Excellent|Good|Needs Attention|Critical), score (0-100), summary (string singkat 1-2 kalimat), findings (array string, max 5), recommendations (array string, max 5), next_service_km (angka atau null).`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Balas HANYA dengan JSON valid tanpa markdown code fence." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      overall_status: parsed.overall_status ?? "Good",
      score: Number(parsed.score) || 75,
      summary: parsed.summary ?? "",
      findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 5) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : [],
      next_service_km: parsed.next_service_km ?? null,
      generated_at: new Date().toISOString(),
    };
  } catch (_e) {
    return deterministicFallback(spk.data ?? {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { spk_id } = await req.json();
    if (!spk_id) {
      return new Response(JSON.stringify({ error: "spk_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: spk, error } = await admin.from("spk_orders").select("*").eq("id", spk_id).maybeSingle();
    if (error || !spk) {
      return new Response(JSON.stringify({ error: error?.message ?? "spk_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const report = await aiAnalyze(spk);
    await admin.from("spk_orders").update({ ai_health_report: report as any }).eq("id", spk_id);

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});