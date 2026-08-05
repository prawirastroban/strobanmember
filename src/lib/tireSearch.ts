export interface ParsedTireQuery {
  width: number | null;
  profile: number | null;
  rim: number | null;
  terms: string[];
  raw: string;
}

export interface TireSearchable {
  brand: string;
  type: string;
  size: string;
  category?: string;
}

const SIZE_FULL = /(\d{3})\s*[/x-]?\s*(\d{2})\s*[/ -]?\s*r?\s*(\d{2})\b/i;
const SIZE_WIDTH_PROFILE = /(\d{3})\s*[/x-]\s*(\d{2})\b/i;
const RIM_ONLY = /\b(?:r|ring|rim)\s*(\d{2})\b/i;

/** Pecah query jadi komponen ukuran (lebar/profil/rim) + kata kunci merk/tipe. */
export const parseTireQuery = (raw: string): ParsedTireQuery => {
  const q = (raw || "").trim();
  let rest = q;
  let width: number | null = null;
  let profile: number | null = null;
  let rim: number | null = null;

  const full = rest.match(SIZE_FULL);
  if (full) {
    width = Number(full[1]);
    profile = Number(full[2]);
    rim = Number(full[3]);
    rest = rest.replace(full[0], " ");
  } else {
    const wp = rest.match(SIZE_WIDTH_PROFILE);
    if (wp) {
      width = Number(wp[1]);
      profile = Number(wp[2]);
      rest = rest.replace(wp[0], " ");
    }
    const r = rest.match(RIM_ONLY);
    if (r) {
      rim = Number(r[1]);
      rest = rest.replace(r[0], " ");
    } else if (!wp) {
      // "205 65 15" tanpa pemisah
      const loose = rest.match(/\b(\d{3})\s+(\d{2})\s+(\d{2})\b/);
      if (loose) {
        width = Number(loose[1]);
        profile = Number(loose[2]);
        rim = Number(loose[3]);
        rest = rest.replace(loose[0], " ");
      }
    }
  }

  // Angka 2 digit yang berdiri sendiri dianggap rim (mis. "15")
  if (rim === null && width === null) {
    const solo = rest.match(/(?:^|\s)(1[2-9]|2[0-4])(?:\s|$)/);
    if (solo) {
      rim = Number(solo[1]);
      rest = rest.replace(solo[0], " ");
    }
  }

  const terms = rest
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  return { width, profile, rim, terms, raw: q };
};

export const parseTireSize = (size: string) => {
  const raw = size || "";
  const m = raw.match(SIZE_FULL);
  if (m) return { width: Number(m[1]), profile: Number(m[2]), rim: Number(m[3]) } as const;
  // Format tanpa profil, mis. "185R14C" / "165R13C"
  const noProfile = raw.match(/(\d{3})\s*r\s*(\d{2})/i);
  if (noProfile) {
    return { width: Number(noProfile[1]), profile: null, rim: Number(noProfile[2]) } as const;
  }
  return { width: null, profile: null, rim: null } as const;
};

export const isEmptyQuery = (p: ParsedTireQuery) =>
  p.width === null && p.profile === null && p.rim === null && p.terms.length === 0;

/** Cocokkan ban terhadap query terparsing. Cocok longgar: hanya kriteria terisi yang diuji. */
export const matchTire = (tire: TireSearchable, p: ParsedTireQuery): boolean => {
  if (isEmptyQuery(p)) return true;
  const size = parseTireSize(tire.size);
  if (p.width !== null && size.width !== p.width) return false;
  if (p.profile !== null && size.profile !== p.profile) return false;
  if (p.rim !== null && size.rim !== p.rim) return false;

  if (p.terms.length > 0) {
    const hay = `${tire.brand} ${tire.type} ${tire.category ?? ""} ${tire.size}`.toLowerCase();
    return p.terms.every((t) => hay.includes(t));
  }
  return true;
};

/** Saran ketik: merk, ukuran, dan kombinasi merk+ukuran yang benar-benar ada. */
export const buildSuggestions = (
  tires: TireSearchable[],
  query: string,
  limit = 8
): string[] => {
  const q = (query || "").trim().toLowerCase();
  const pool = new Set<string>();

  const brands = [...new Set(tires.map((t) => t.brand).filter(Boolean))];
  const sizes = [...new Set(tires.map((t) => t.size).filter((s) => s && s !== "-"))];

  brands.forEach((b) => pool.add(b));
  sizes.forEach((s) => pool.add(s));
  tires.forEach((t) => {
    if (t.brand && t.size && t.size !== "-") pool.add(`${t.brand} ${t.size}`);
  });

  const all = [...pool];
  if (!q) {
    return [...brands.slice(0, Math.ceil(limit / 2)), ...sizes.slice(0, limit)].slice(0, limit);
  }
  const normalizedQ = q.replace(/\s+/g, "");
  const scored = all
    .filter((s) => {
      const n = s.toLowerCase();
      return n.includes(q) || n.replace(/\s+/g, "").includes(normalizedQ);
    })
    .sort((a, b) => a.length - b.length);

  return scored.slice(0, limit);
};

/** Daftar rim unik yang tersedia, terurut. */
export const availableRims = (tires: TireSearchable[]): number[] =>
  [...new Set(tires.map((t) => parseTireSize(t.size).rim).filter((r): r is number => !!r))].sort(
    (a, b) => a - b
  );
