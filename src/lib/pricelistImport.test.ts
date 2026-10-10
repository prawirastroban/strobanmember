import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseTireExcel } from "./pricelistImport";
import { matchesQuery, type PricelistItem } from "./pricelistSearch";

const file = (data: unknown[][]) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "OIL");
  const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return { arrayBuffer: async () => bytes } as File;
};
const headers = ["BRAND", "TYPE", "KODE BARANG", "NAMA BARANG", "SATUAN", "HEB", "RETAIL"];
const sample = ["Adnoc", "Oil", 102863, "ADNOC VOYAGER 5W-30 LTR", "LITER", 120000, 125000];
describe("uploaded OIL format", () => {
  it("maps product code, name, unit and exact HEB/retail prices without tire fields", async () => {
    const result = await parseTireExcel(file([headers, sample]), "oli");
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ item_code: "102863", item_name: "ADNOC VOYAGER 5W-30 LTR", unit: "LITER", price_heb: 120000, price_retail: 125000, size: null, rim: null, price_grosir: null });
  });
  it("reports missing product column", async () => {
    expect((await parseTireExcel(file([["BRAND", "RETAIL"], ["Adnoc", 125000]]), "oli")).rows).toEqual([]);
  });
  it("rejects duplicate product codes", async () => {
    const result = await parseTireExcel(file([headers, sample, sample]), "oli");
    expect(result.errors).toHaveLength(1);
    expect(result.rows).toHaveLength(1);
  });
  it("finds viscosity across formats and exact product code", async () => {
    const { rows } = await parseTireExcel(file([headers, sample]), "oli");
    const item: PricelistItem = { ...rows[0], id: "1", category: "oli" };
    for (const query of ["5w30", "5W-30", "5w 30", "102863", "adnoc voyager"]) expect(matchesQuery(item, query)).toBe(true);
    expect(matchesQuery(item, "10w40")).toBe(false);
  });
});