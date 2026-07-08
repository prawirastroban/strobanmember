import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-version, x-app-build, x-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role check: admin or staff
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "staff");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI belum dikonfigurasi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rangeLabel: Record<string, string> = {
      today: "hari ini",
      "7d": "7 hari terakhir",
      "30d": "30 hari terakhir",
    };

    const summary = {
      periode: rangeLabel[payload.range] || payload.range || "-",
      user_baru: payload.newUsers ?? 0,
      total_booking: payload.bookings ?? 0,
      selesai: payload.completed ?? 0,
      revenue_total: payload.revenue ?? 0,
      revenue_terbayar: payload.revenuePaid ?? 0,
      top_services: payload.topServices ?? [],
      top_cities: payload.topCities ?? [],
      top_branches: payload.topBranches ?? [],
      status_funnel: payload.statusFunnel ?? [],
      jam_sibuk: payload.peakHours ?? [],
      tren: payload.trend ?? [],
    };

    const systemPrompt = `Kamu adalah analis operasional bengkel mobil "Stroban Service". Berdasarkan ringkasan data internal dashboard, buat laporan singkat dalam Bahasa Indonesia:
1. Satu paragraf ringkasan performa (maks 3 kalimat).
2. 3-5 poin rekomendasi aksi konkret yang bisa langsung dilakukan tim (bullet dimulai dengan kata kerja).
Format jawaban dalam Markdown. Fokus pada insight yang actionable, bukan sekadar mengulang angka. Jika data kosong / terlalu kecil, sarankan aksi mendasar (mis. tingkatkan promosi, aktifkan channel WA).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Ringkasan data:\n" + JSON.stringify(summary, null, 2) },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: "Terlalu banyak permintaan AI. Coba lagi beberapa saat." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: "Kuota AI habis. Tambahkan kredit di Settings → Plans & credits." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: t.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiRes.json();
    const insight: string =
      aiJson?.choices?.[0]?.message?.content?.toString() ?? "";

    return new Response(
      JSON.stringify({ insight, generated_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});