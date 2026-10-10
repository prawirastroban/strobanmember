import { describe, it, expect } from "vitest";
import { matchesQuery, type PricelistItem } from "./pricelistSearch";

const item: PricelistItem = {
  id: "1", category: "ban", brand: "ACCELERA", type: "RADIAL", kategori: "R12 - R14",
  pattern: "Eco Plush", rim: 14, size: "185/65 R14", size_key: "1856514",
  price_grosir: 1, price_external: 1, price_heb: 1, price_retail: 1,
  vehicle_model: "Toyota Avanza, Daihatsu Xenia",
};

describe("pricelist smart search", () => {
  for (const q of ["185/65R14", "185 65 14", "1856514", "185-65-r14", "r14 185", "accelera eco", "avanza"]) {
    it(`finds 185/65 R14 with "${q}"`, () => expect(matchesQuery(item, q)).toBe(true));
  }
  it("rejects other size", () => expect(matchesQuery(item, "195/65 R15")).toBe(false));
  it("rejects R13 for 185 65 14", () => expect(matchesQuery({ ...item, size: "185/65 R13", size_key: "1856513", rim: 13 }, "185 65 14")).toBe(false));
  it("rejects other brand", () => expect(matchesQuery(item, "bridgestone")).toBe(false));
});
