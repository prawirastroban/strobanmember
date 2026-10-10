import * as XLSX from "xlsx";
import { sizeKey } from "./pricelistSearch";

export interface ImportRow {
  brand: string; type: string | null; kategori: string | null; pattern: string | null;
  rim: number | null; size: string | null; size_key: string;
  price_grosir: number | null; price_external: number | null; price_heb: number | null; price_retail: number | null;
  vehicle_model: string | null;
  item_code?: string | null; item_name?: string | null; unit?: string | null;
}

export type PricelistCategory = "ban" | "oli" | "sparepart";
export const importKey = (r: { brand: string; pattern?: string | null; size?: string | null; item_code?: string | null }, category: PricelistCategory) =>
  (category !== "ban" ? r.item_code ?? "" : `${r.brand}|${r.pattern}|${r.size}`).toLowerCase();

const REQUIRED = ["BRAND", "SIZE", "RETAIL"];

const str = (v: unknown) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());
const num = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};

export async function parseTireExcel(file: File, category: PricelistCategory = "ban"): Promise<{ rows: ImportRow[]; errors: string[] }> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = wb.SheetNames.find((n) => (category === "oli" ? ["OIL", "OLI"] : category === "sparepart" ? ["SPAREPARTS", "SPAREPART"] : ["BAN"]).includes(n.trim().toUpperCase())) ?? wb.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ["Sheet kosong"] };
  const ws = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  const headerRow = Math.max(0, grid.findIndex((row) => row.some((c) => String(c ?? "").trim().toUpperCase() === "BRAND")));
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, range: (ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r : 0) + headerRow });
  const errors: string[] = [];
  if (!raw.length) return { rows: [], errors: ["Sheet kosong"] };
  const keys = Object.keys(raw[0]).map((k) => k.trim().toUpperCase());
  const missing = (category === "oli" ? ["BRAND", "TYPE", "KODE BARANG", "NAMA BARANG", "SATUAN", "HEB", "RETAIL"] : category === "sparepart" ? ["BRAND", "TYPE", "KODE BARANG", "NAMA BARANG", "EXTERNAL", "HEB", "RETAIL"] : REQUIRED).filter((r) => !keys.includes(r));
  if (missing.length) return { rows: [], errors: [`Kolom wajib tidak ada: ${missing.join(", ")}`] };

  const rows: ImportRow[] = [];
  raw.forEach((r0, i) => {
    const r: Record<string, unknown> = {};
    Object.entries(r0).forEach(([k, v]) => (r[k.trim().toUpperCase()] = v));
    const brand = str(r.BRAND);
    if (!brand) return; // skip blank lines
    const size = str(r.SIZE);
    const retail = num(r.RETAIL);
    if (category === "oli") {
      const code = str(r["KODE BARANG"]), name = str(r["NAMA BARANG"]), unit = str(r.SATUAN);
      if (!code || !name || !unit || retail === null) { errors.push(`Baris ${i + 2}: kode, nama, satuan atau harga retail kosong`); return; }
      if (rows.some((row) => row.item_code === code)) { errors.push(`Baris ${i + 2}: kode barang ${code} duplikat`); return; }
      rows.push({ brand, type: str(r.TYPE), item_code: code, item_name: name, unit,
        kategori: null, pattern: null, rim: null, size: null, size_key: "",
        price_grosir: null, price_external: null, price_heb: num(r.HEB), price_retail: retail, vehicle_model: null });
      return;
    }
    if (category === "sparepart") {
      const code = str(r["KODE BARANG"]), name = str(r["NAMA BARANG"]);
      if (!code || !name || retail === null) { errors.push(`Baris ${i + headerRow + 2}: kode, nama atau harga retail kosong`); return; }
      if (rows.some((row) => row.item_code === code)) { errors.push(`Baris ${i + headerRow + 2}: kode barang ${code} duplikat`); return; }
      rows.push({ brand, type: str(r.TYPE), item_code: code, item_name: name, unit: null,
        kategori: null, pattern: null, rim: null, size: null, size_key: "",
        price_grosir: null, price_external: num(r.EXTERNAL), price_heb: num(r.HEB), price_retail: retail, vehicle_model: str(r["VEHICLE MODEL"]) });
      return;
    }
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
