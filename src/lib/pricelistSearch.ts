export interface PricelistItem {
  id: string;
  category: string;
  brand: string;
  type: string | null;
  kategori: string | null;
  pattern: string | null;
  rim: number | null;
  size: string | null;
  size_key: string | null;
  price_grosir: number | null;
  price_external: number | null;
  price_heb: number | null;
  price_retail: number | null;
  vehicle_model: string | null;
  updated_at?: string;
}

/** "185/65 R14" -> "1856514" (digits only, format-agnostic). */
export const sizeKey = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const haystack = (it: PricelistItem) =>
  norm([it.brand, it.type, it.kategori, it.pattern, it.size, it.rim ? `r${it.rim}` : "", it.vehicle_model].join(" "));

/**
 * Smart match: works across formats — "185/65R14", "185 65 14", "1856514",
 * "185-65-r14", "r14 185", "accelera gamma", "avanza".
 */
export function matchesQuery(it: PricelistItem, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const key = it.size_key || sizeKey(it.size);
  const qDigits = q.replace(/\D/g, "");
  // Whole query is a size (only digits + separators + optional R) → compare digit keys
  if (/^[\d\s/\-.rR]+$/.test(q) && qDigits.length >= 3 && key.includes(qDigits)) return true;

  const text = haystack(it);
  const words = text.split(" ");
  // Split letters/digits: "r14" stays, "185/65r14" → "185 65 r14"
  const tokens = norm(q.replace(/(\d)([a-z])/gi, "$1 $2")).split(" ").filter(Boolean);
  return tokens.every((t) => {
    if (/^\d+$/.test(t)) return key.includes(t) || words.some((w) => w.startsWith(t) || w === `r${t}`);
    if (/^r\d+$/.test(t)) return it.rim === Number(t.slice(1)) || text.includes(t);
    return text.includes(t);
  });
}
