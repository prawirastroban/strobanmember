// SPK OCR Scan — reads a photo of the paper SPK form and returns structured
// fields with per-field confidence. No DB writes; pure read/parse helper.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const CHECK_CODES = [
  "chk_engine_oil", "chk_brake_fluid", "chk_packing_seal", "chk_brake_pad_front",
  "chk_brake_pad_rear", "chk_v_belt", "chk_spark_plug", "chk_power_steering",
  "chk_transmission_fluid", "chk_diff_gear_oil", "chk_brake_cylinder",
  "chk_brake_calipers", "chk_air_filter", "chk_fuel_filter", "chk_coolant",
  "chk_wiper_blades", "chk_wiper_fluid", "chk_battery", "chk_alternator",
  "chk_ac_compressor", "chk_ac_magnetic_clutch", "chk_ac_condensor", "chk_ac_pipe",
  "chk_ac_switch", "chk_ac_compressor_oil", "chk_ac_evaporator", "chk_ac_motor_fan",
  "chk_ac_blower", "chk_ac_automatic", "chk_ac_cabin_air_filter",
  "chk_ac_high_pressure", "chk_ac_low_pressure",
  "chk_suspension_wheel_bearing", "chk_suspension_control_arm",
  "chk_suspension_ball_joint", "chk_suspension_shock_absorber",
];

const SYSTEM = `Kamu adalah mesin OCR + parser untuk formulir SPK (Surat Perintah Kerja) bengkel mobil Indonesia.
Baca foto formulir kertas dan keluarkan HANYA JSON valid (tanpa markdown, tanpa penjelasan).

Bentuk JSON:
{
  "fields": {
    "<nama_field>": { "value": <string|null>, "confidence": <0..1> }
  },
  "checks": { "<kode_check>": { "value": "good"|"ok"|"bad"|"na", "confidence": <0..1> } },
  "lamps": { "HEAD": true|false, "FOG": ..., "TURN": ..., "REVERSE": ..., "REAR": ..., "BRAKE": ... }
}

Daftar nama_field yang wajib ada (isi null bila tidak terbaca):
vehicle_plate, customer_name, customer_phone, vehicle_merk, vehicle_tipe, vehicle_tahun,
vehicle_mileage_now, sales_advisor, branch, mechanic_name, complaint_note,
complaint_estimasi, service_oil_brand, service_oil_qty, service_jasa,
service_sparepart, mechanic_note.

Aturan:
- Jangan menebak. Bila ragu, tetap isi nilai terbaik tetapi turunkan confidence (<0.7).
- Bila kolom kosong pada kertas, isi value null dan confidence 0.
- Nomor HP tulis apa adanya (boleh diawali 0 atau +62).
- Plat nomor huruf kapital.
- KM/mileage hanya angka.
- Untuk "checks", hanya keluarkan kode yang benar-benar tercentang/terisi di kertas.
- Kode check yang valid: ${CHECK_CODES.join(", ")}.
- "good" = baik, "ok" = perlu perhatian ringan, "bad" = harus diganti/rusak, "na" = tidak dicek.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "LOVABLE_API_KEY belum dikonfigurasi" }, 500);

    let body: { image_base64?: string; mime_type?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Body tidak valid" }, 400);
    }

    const image = typeof body.image_base64 === "string" ? body.image_base64 : "";
    const mime = typeof body.mime_type === "string" ? body.mime_type : "image/jpeg";
    if (!image || image.length < 100) return json({ error: "Foto tidak terbaca" }, 400);
    if (image.length > 12_000_000) return json({ error: "Foto terlalu besar, coba ulangi" }, 400);
    if (!ALLOWED_MIME.includes(mime)) return json({ error: "Format foto tidak didukung" }, 400);

    const dataUrl = image.startsWith("data:") ? image : `data:${mime};base64,${image}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Baca formulir SPK pada foto ini dan keluarkan JSON sesuai format." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) return json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, 429);
    if (res.status === 402) return json({ error: "Kredit AI habis. Tambahkan kredit workspace." }, 402);
    if (!res.ok) {
      const detail = await res.text();
      console.error("gateway error", res.status, detail.slice(0, 500));
      return json({ error: "Gagal memproses OCR" }, 502);
    }

    const payload = await res.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    } catch {
      const m = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }
    if (!parsed || typeof parsed !== "object") {
      return json({ error: "Hasil OCR tidak bisa dibaca. Coba foto ulang lebih jelas." }, 422);
    }

    // Sanitize: keep only known check codes, clamp confidence.
    const fields: Record<string, { value: string | null; confidence: number }> = {};
    const src = parsed.fields && typeof parsed.fields === "object" ? parsed.fields : {};
    for (const [k, v] of Object.entries(src as Record<string, any>)) {
      const value = v?.value === null || v?.value === undefined || v?.value === ""
        ? null
        : String(v.value).slice(0, 500);
      const c = Number(v?.confidence);
      fields[k] = { value, confidence: Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0 };
    }

    const checks: Record<string, { value: string; confidence: number }> = {};
    const csrc = parsed.checks && typeof parsed.checks === "object" ? parsed.checks : {};
    for (const [k, v] of Object.entries(csrc as Record<string, any>)) {
      if (!CHECK_CODES.includes(k)) continue;
      const val = String(v?.value ?? "");
      if (!["good", "ok", "bad", "na"].includes(val)) continue;
      const c = Number(v?.confidence);
      checks[k] = { value: val, confidence: Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0 };
    }

    const lamps: Record<string, boolean> = {};
    const lsrc = parsed.lamps && typeof parsed.lamps === "object" ? parsed.lamps : {};
    for (const k of ["HEAD", "FOG", "TURN", "REVERSE", "REAR", "BRAKE"]) {
      if (lsrc[k] === true) lamps[k] = true;
    }

    return json({ fields, checks, lamps });
  } catch (err) {
    console.error("spk-ocr-scan error", err);
    return json({ error: "Terjadi kesalahan tak terduga" }, 500);
  }
});
