import { normalizeBanData } from "./banForm";
// Bridge OCR hasil scan → form intake SPK (/spk/new).
// Disimpan sementara di sessionStorage; tidak menyentuh DB/workflow.

export interface OcrField { value: string | null; confidence: number }
export interface OcrCheck { value: string; confidence: number }

export interface OcrScanResult {
  fields: Record<string, OcrField>;
  checks: Record<string, OcrCheck>;
  lamps: Record<string, boolean>;
  /** Hanya untuk SPK Ban: isian khusus formulir ban. */
  ban?: Record<string, unknown>;
}

export interface SpkScanPrefill {
  /** Field yang langsung mengisi form intake. */
  form: Record<string, string>;
  /** Key tambahan yang di-merge ke `data` SPK (checklist, catatan mekanik, dll). */
  extraData: Record<string, unknown>;
  /** Nama cabang hasil OCR (dicocokkan di form). */
  branchText?: string;
  /** Field dengan confidence rendah, untuk badge peringatan. */
  lowConfidence: string[];
}

export const OCR_LOW_CONFIDENCE = 0.7;
const KEY = "spk:scan-prefill";

/** Field editable yang tampil di Preview Card, urut sesuai formulir kertas. */
export const OCR_FIELD_DEFS: Array<{ key: string; label: string; group: string; multiline?: boolean }> = [
  { key: "customer_name", label: "Nama Pelanggan", group: "Pelanggan" },
  { key: "customer_phone", label: "Nomor HP", group: "Pelanggan" },
  { key: "branch", label: "Cabang", group: "Pelanggan" },
  { key: "sales_advisor", label: "Sales Advisor", group: "Pelanggan" },
  { key: "vehicle_plate", label: "Plat Kendaraan", group: "Kendaraan" },
  { key: "vehicle_merk", label: "Merk Mobil", group: "Kendaraan" },
  { key: "vehicle_tipe", label: "Tipe", group: "Kendaraan" },
  { key: "vehicle_tahun", label: "Tahun", group: "Kendaraan" },
  { key: "vehicle_mileage_now", label: "KM Sekarang", group: "Kendaraan" },
  { key: "mechanic_name", label: "Mekanik", group: "Servis" },
  { key: "service_oil_brand", label: "Oli (Merek)", group: "Servis" },
  { key: "service_oil_qty", label: "Oli (Liter)", group: "Servis" },
  { key: "service_jasa", label: "Jasa", group: "Servis", multiline: true },
  { key: "service_sparepart", label: "Sparepart", group: "Servis", multiline: true },
  { key: "complaint_note", label: "Keluhan", group: "Catatan", multiline: true },
  { key: "complaint_estimasi", label: "Estimasi", group: "Catatan", multiline: true },
  { key: "mechanic_note", label: "Catatan Mekanik", group: "Catatan", multiline: true },
];

export const OCR_GROUPS = ["Pelanggan", "Kendaraan", "Servis", "Catatan"] as const;

export const OCR_FIELD_DEFS_BAN: Array<{ key: string; label: string; group: string; multiline?: boolean }> = [
  { key: "customer_name", label: "Nama", group: "Customer" },
  { key: "customer_phone", label: "No. HP", group: "Customer" },
  { key: "vehicle_plate", label: "No Plat", group: "Customer" },
  { key: "booking_date", label: "Tanggal", group: "Customer" },
  { key: "vehicle_merk", label: "Merk Mobil", group: "Mobil & Ban" },
  { key: "vehicle_tipe", label: "Tipe Mobil", group: "Mobil & Ban" },
  { key: "vehicle_tahun", label: "Tahun", group: "Mobil & Ban" },
  { key: "ban_ukuran_ban", label: "Ukuran Ban", group: "Mobil & Ban" },
  { key: "ban_merk_ban", label: "Merk Ban", group: "Mobil & Ban" },
  { key: "ban_history_merk", label: "Merk/Tipe Lama", group: "History" },
  { key: "ban_history_ukuran", label: "Ukuran Lama", group: "History" },
  { key: "sales_advisor", label: "Admin", group: "Petugas" },
  { key: "mechanic_name", label: "Teknisi", group: "Petugas" },
  { key: "ban_catatan", label: "Catatan", group: "Catatan", multiline: true },
];
export const OCR_GROUPS_BAN = ["Customer", "Mobil & Ban", "History", "Petugas", "Catatan"] as const;
const BAN_KEYS = ["ukuran_ban", "merk_ban", "history_merk", "history_ukuran", "catatan"];

const digits = (s: string) => s.replace(/\D/g, "");

/** Normalisasi nilai per field agar sesuai format form intake. */
export function normalizeOcrValue(key: string, raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (key === "vehicle_plate") return v.toUpperCase().replace(/\s+/g, " ");
  if (key === "vehicle_tahun") return digits(v).slice(0, 4);
  if (key === "vehicle_mileage_now") {
    const d = digits(v).slice(0, 9);
    return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
  }
  if (key === "customer_phone") return v.replace(/[^0-9+\-\s]/g, "").slice(0, 20);
  if (key === "service_oil_qty") return digits(v).slice(0, 3);
  return v;
}

/** Ubah hasil mentah OCR menjadi payload prefill siap pakai. */
export function buildPrefill(result: OcrScanResult, spkType: "service" | "ban" = "service"): SpkScanPrefill {
  const values: Record<string, string> = {};
  const lowConfidence: string[] = [];
  const isBan = spkType === "ban";
  for (const def of isBan ? OCR_FIELD_DEFS_BAN : OCR_FIELD_DEFS) {
    if (def.key.startsWith("ban_")) {
      const raw = (result.ban as Record<string, unknown> | undefined)?.[def.key.slice(4)];
      values[def.key] = raw ? String(raw).trim() : "";
      continue;
    }
    const f = result.fields?.[def.key];
    const val = f?.value ? normalizeOcrValue(def.key, String(f.value)) : "";
    values[def.key] = val;
    if (val && (f?.confidence ?? 0) < OCR_LOW_CONFIDENCE) lowConfidence.push(def.key);
  }
  return { form: values, extraData: buildExtraData(result), lowConfidence };
}

/** Checklist & catatan mekanik → key v2 yang dibaca Canvas + PDF. */
export function buildExtraData(result: OcrScanResult): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [code, chk] of Object.entries(result.checks ?? {})) {
    out[`${code}_cond`] = chk.value;
  }
  const lamps = result.lamps ?? {};
  if (Object.keys(lamps).length) out.lamps_flags = lamps;
  if (result.ban && typeof result.ban === "object") out.ban = normalizeBanData(result.ban);
  return out;
}

/** Gabungkan nilai form (sudah diedit user) + extraData jadi payload final. */
export function composePrefill(
  values: Record<string, string>,
  extraData: Record<string, unknown>,
  lowConfidence: string[],
  spkType: "service" | "ban" = "service",
): SpkScanPrefill {
  const extra: Record<string, unknown> = { ...extraData };
  if (spkType === "ban") {
    const ban = { ...((extra.ban as Record<string, unknown>) ?? {}) };
    for (const k of BAN_KEYS) ban[k] = values[`ban_${k}`] ?? ban[k] ?? "";
    extra.ban = normalizeBanData(ban);
  }
  if (values.mechanic_note) extra.mechanic_note = values.mechanic_note;
  if (values.sales_advisor) extra.sales_advisor = values.sales_advisor;
  if (values.mechanic_name) extra.mechanic_name = values.mechanic_name;
  if (values.service_sparepart) extra.service_sparepart_note = values.service_sparepart;
  return {
    form: values,
    extraData: extra,
    branchText: values.branch || undefined,
    lowConfidence,
  };
}

export function saveScanPrefill(p: SpkScanPrefill) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* storage penuh — abaikan */ }
}

export function takeScanPrefill(): SpkScanPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || typeof p.form !== "object") return null;
    return p as SpkScanPrefill;
  } catch {
    return null;
  }
}
