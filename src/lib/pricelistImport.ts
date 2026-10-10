import * as XLSX from "xlsx";
import { sizeKey } from "./pricelistSearch";

export interface ImportRow {
  brand: string; type: string | null; kategori: string | null; pattern: string | null;
  rim: number | null; size: string | null; size_key: string;
  price_grosir: number | null; price_external: number | null; price_heb: number | null; price_retail: number | null;
  vehicle_model: string | null;
}

const REQUIRED = ["BRAND", "SIZE", "RETAIL"];

const str = (v: unknown) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());
const num = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};

export async function parseTireExcel(file: File): Promise<{ rows: ImportRow[]; errors: string[] }> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = wb.SheetNames.find((n) => n.trim().toUpperCase() === "BAN") ?? wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: null });
  const errors: string[] = [];
  if (!raw.length) return { rows: [], errors: ["Sheet kosong"] };
  const keys = Object.keys(raw[0]).map((k) => k.trim().toUpperCase());
  const missing = REQUIRED.filter((r) => !keys.includes(r));
  if (missing.length) return { rows: [], errors: [`Kolom wajib tidak ada: ${missing.join(", ")}`] };

  const rows: ImportRow[] = [];
  raw.forEach((r0, i) => {
    const r: Record<string, unknown> = {};
    Object.entries(r0).forEach(([k, v]) => (r[k.trim().toUpperCase()] = v));
    const brand = str(r.BRAND);
    if (!brand) return; // skip blank lines
    const size = str(r.SIZE);
    const retail = num(r.RETAIL);
    if (!size || retail === null) { errors.push(`Baris ${i + 2}: ukuran atau harga retail kosong`); return; }
    rows.push({
      brand, type: str(r.TYPE), kategori: str(r.KATEGORI), pattern: str(r.PATTERN),
      rim: num(r.RIM), size, size_key: sizeKey(size),
      price_grosir: num(r.GROSIR), price_external: num(r.EXTERNAL), price_heb: num(r.HEB), price_retail: retail,
      vehicle_model: str(r["VEHICLE MODEL"]),
    });
  });
  return { rows, errors };
}
