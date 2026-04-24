import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ReqSchema = z.object({
  mode: z.enum(["search", "complaint"]),
  query: z.string().trim().min(2).max(500),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const parsed = ReqSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { mode, query } = parsed.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Load active services as the source of truth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: services, error: svcErr } = await admin
      .from("services")
      .select("id,name,category,description,price,duration")
      .eq("is_active", true)
      .order("is_popular", { ascending: false })
      .order("sort_order", { ascending: true });
    if (svcErr) throw svcErr;

    const catalog = (services ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description ?? "",
    }));

    const systemPrompt = `Anda adalah asisten bengkel mobil "Sahabat Stroban Service".
Tugas Anda: bantu pelanggan memilih layanan yang tepat.

ATURAN PENTING:
- Jawab dalam Bahasa Indonesia, ramah, singkat (maks 2-3 kalimat).
- Hanya rekomendasikan layanan yang ADA di daftar. Gunakan persis "id" layanan dari katalog.
- Maksimal 3 rekomendasi.
- Jika tidak yakin, rekomendasikan layanan pengecekan umum (cari yang mengandung kata "checkup", "cek", atau "general") atau kembalikan rekomendasi kosong.
- Jangan mengarang layanan baru.

MODE: ${mode === "search" ? "Pencarian layanan" : "Diagnosa keluhan kendaraan"}.
${mode === "complaint" ? "Pelanggan menjelaskan gejala/keluhan. Berikan kemungkinan penyebab singkat lalu sarankan layanan." : "Pelanggan mencari layanan. Cocokkan dengan kebutuhan mereka."}

KATALOG LAYANAN (JSON):
${JSON.stringify(catalog)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_services",
              description: "Berikan jawaban singkat dan rekomendasi layanan dari katalog.",
              parameters: {
                type: "object",
                properties: {
                  answer: {
                    type: "string",
                    description: "Penjelasan singkat 2-3 kalimat untuk pelanggan.",
                  },
                  service_ids: {
                    type: "array",
                    description: "Maksimal 3 ID layanan dari katalog yang paling relevan.",
                    items: { type: "string" },
                    maxItems: 3,
                  },
                },
                required: ["answer", "service_ids"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_services" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Layanan AI sedang tidak tersedia." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let answer = "Kami sarankan pengecekan awal oleh teknisi kami.";
    let ids: string[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        if (typeof args.answer === "string") answer = args.answer;
        if (Array.isArray(args.service_ids)) ids = args.service_ids.slice(0, 3);
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }

    // Resolve to full service objects, preserving order
    const byId = new Map((services ?? []).map((s) => [s.id, s]));
    let recommended = ids.map((id) => byId.get(id)).filter(Boolean);

    // Fallback: nothing matched → suggest a generic checkup
    if (recommended.length === 0) {
      const fallback = (services ?? []).find((s) =>
        /checkup|cek|general|inspeksi/i.test(`${s.name} ${s.description ?? ""}`),
      );
      if (fallback) recommended = [fallback];
      if (!answer) answer = "Kami sarankan pengecekan awal oleh teknisi kami.";
    }

    return new Response(
      JSON.stringify({ answer, recommendations: recommended }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("consultation error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});