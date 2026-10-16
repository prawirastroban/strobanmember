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

const SYSTEM_BAN = `Kamu adalah mesin OCR + parser untuk "Form Pelanggan Ban" (TOMO / Bridgestone) bengkel Stroban.
Baca foto formulir kertas (sering tulisan tangan) dan keluarkan HANYA JSON valid.

Tata letak kertas:
- Kiri atas: Nama, No. HP, Alamat, No Plat. Kanan atas: Merk/Tipe Mobil, Tahun Mobil, Ukuran Ban, Merk Ban. Tanggal di pojok kanan atas.
- Baris waktu: Waktu Masuk, Waktu Mulai, Waktu Selesai, Waktu Jeda + Ket.
- "Services": Spooring, Balancing, Nitrogen, Rotasi (lingkaran).
- Blok "Sebelum" dan "Sesudah": Tekanan Ban (Baik/Kurang), Keausan Ban (Baik/Tidak Rata), Velg/Baut (Normal/Bengkok).
- Ban Bekas: Bawa / Tinggal. Catatan: area kosong di bawahnya.
- Diagram kanan: 4 kotak "mm" per ban untuk Sebelum dan Sesudah (kiri-atas = depan kiri fl, kanan-atas = depan kanan fr, kiri-bawah = belakang kiri rl, kanan-bawah = belakang kanan rr). Jumlah Balancing ..../pcs dan Rotasi ..../pcs.
- History: Merk/Tipe Lama, Ukuran Lama. Bawah: tanda tangan/nama Admin, Teknisi.

Aturan tanda pilihan: lingkaran yang dicoret, dicentang, diisi, atau diberi tanda V/✓ = DIPILIH. Lingkaran kosong = tidak dipilih. Untuk setiap pasangan opsi pilih paling banyak satu.
Angka mm: tulis angkanya saja (mis. "8"). Tanda "-" atau kosong = "".

Bentuk JSON:
{
  "fields": { "<nama_field>": { "value": <string|null>, "confidence": <0..1> } },
  "ban": {
    "ukuran_ban": "", "merk_ban": "",
    "services": ["Spooring"|"Balancing"|"Nitrogen"|"Rotasi"],
    "sebelum": { "tekanan": ""|"baik"|"kurang", "keausan": ""|"baik"|"tidak_rata", "velg": ""|"normal"|"bengkok" },
    "sesudah": { ...sama... },
    "tyres_sebelum": { "fl": {"mm": ""}, "fr": {"mm": ""}, "rl": {"mm": ""}, "rr": {"mm": ""} },
    "tyres_sesudah": { ...sama... },
    "balancing_qty": "", "rotasi_qty": "",
    "ban_bekas": ""|"bawa"|"tinggal",
    "catatan": "", "history_merk": "", "history_ukuran": "",
    "waktu_jeda": "", "waktu_jeda_ket": ""
  }
}
nama_field wajib: booking_date (=Tanggal, format YYYY-MM-DD bila bisa), customer_name, customer_phone, vehicle_plate, vehicle_merk, vehicle_tipe, vehicle_tahun, sales_advisor (=Admin), mechanic_name (=Teknisi), (Catatan isi ke ban.catatan).
"Merk/Tipe Mobil" isi ke vehicle_merk (merk) dan vehicle_tipe (tipe); bila hanya satu kata (mis. "Grandmax") taruh di vehicle_tipe dan tebak merknya (Daihatsu) dengan confidence rendah.
Jangan mengarang; bila ragu isi nilai terbaik dengan confidence < 0.7. Plat huruf kapital.`;

const BAN_SERVICES = ["Spooring", "Balancing", "Nitrogen", "Rotasi", "Ganti Ban", "Pengecekan"];
const pick = (v: unknown, opts: string[]) => (typeof v === "string" && opts.includes(v) ? v : "");
const str = (v: unknown, n = 300) => (v === null || v === undefined ? "" : String(v).slice(0, n).trim());
function sanitizeBan(raw: any) {
  const b = raw && typeof raw === "object" ? raw : {};
  const cond = (c: any) => ({
    tekanan: pick(c?.tekanan, ["baik", "kurang"]),
    keausan: pick(c?.keausan, ["baik", "tidak_rata"]),
    velg: pick(c?.velg, ["normal", "bengkok"]),
  });
  const tyres = (t: any) => {
    const out: Record<string, { ganti: boolean; mm: string; psi: string }> = {};
    for (const k of ["fl", "fr", "rl", "rr"]) {
      out[k] = { ganti: false, mm: str(t?.[k]?.mm, 6).replace(/[^0-9.,]/g, ""), psi: str(t?.[k]?.psi, 6).replace(/[^0-9.,]/g, "") };
    }
    return out;
  };
  return {
    ukuran_ban: str(b.ukuran_ban, 60), merk_ban: str(b.merk_ban, 60),
    services: Array.isArray(b.services) ? b.services.filter((x: unknown) => BAN_SERVICES.includes(String(x))) : [],
    sebelum: cond(b.sebelum), sesudah: cond(b.sesudah),
    tyres_sebelum: tyres(b.tyres_sebelum), tyres_sesudah: tyres(b.tyres_sesudah),
    balancing_qty: str(b.balancing_qty, 4).replace(/\D/g, ""), rotasi_qty: str(b.rotasi_qty, 4).replace(/\D/g, ""),
    ban_bekas: pick(b.ban_bekas, ["bawa", "tinggal"]),
    catatan: str(b.catatan, 1000), history_merk: str(b.history_merk, 60), history_ukuran: str(b.history_ukuran, 60),
    waktu_jeda: str(b.waktu_jeda, 30), waktu_jeda_ket: str(b.waktu_jeda_ket, 200),
  };
}

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

    let body: { image_base64?: string; mime_type?: string; spk_type?: string };
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

    const isBan = body.spk_type === "ban";
    const dataUrl = image.startsWith("data:") ? image : `data:${mime};base64,${image}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: isBan ? "medium" : "none",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: isBan ? SYSTEM_BAN : SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: isBan ? "Baca Form Pelanggan Ban pada foto ini dengan teliti, termasuk semua lingkaran pilihan dan angka mm, lalu keluarkan JSON." : "Baca formulir SPK pada foto ini dan keluarkan JSON sesuai format." },
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

    return json(isBan ? { fields, checks: {}, lamps: {}, ban: sanitizeBan(parsed.ban) } : { fields, checks, lamps });
  } catch (err) {
    console.error("spk-ocr-scan error", err);
    return json({ error: "Terjadi kesalahan tak terduga" }, 500);
  }
});
