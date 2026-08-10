export type ThumbFit = "cover" | "contain" | "fill";
export type ThumbPosition = "center" | "top" | "bottom" | "left" | "right";
export type ThumbRatio = "1:1" | "4:3" | "3:4";

export interface ThumbnailSettings {
  thumbnail_url?: string | null;
  thumbnail_fit?: string | null;
  thumbnail_position?: string | null;
  thumbnail_zoom?: number | string | null;
  thumbnail_ratio?: string | null;
  thumbnail_bg?: string | null;
}

export const THUMB_FIT_OPTIONS: { value: ThumbFit; label: string }[] = [
  { value: "cover", label: "Cover — penuhi kotak (boleh terpotong)" },
  { value: "contain", label: "Contain — seluruh gambar tampil" },
  { value: "fill", label: "Fill — regangkan mengikuti kotak" },
];

export const THUMB_POSITION_OPTIONS: { value: ThumbPosition; label: string }[] = [
  { value: "center", label: "Tengah" },
  { value: "top", label: "Atas" },
  { value: "bottom", label: "Bawah" },
  { value: "left", label: "Kiri" },
  { value: "right", label: "Kanan" },
];

export const THUMB_RATIO_OPTIONS: { value: ThumbRatio; label: string }[] = [
  { value: "1:1", label: "1:1 — Persegi (disarankan)" },
  { value: "4:3", label: "4:3 — Landscape" },
  { value: "3:4", label: "3:4 — Portrait" },
];

/** Panduan format gambar thumbnail yang ditampilkan di form admin. */
export const THUMB_FORMAT_HINT = {
  "1:1": "600 × 600 px",
  "4:3": "800 × 600 px",
  "3:4": "600 × 800 px",
} as const;

export const ratioToNumber = (ratio?: string | null): number => {
  switch (ratio) {
    case "4:3":
      return 4 / 3;
    case "3:4":
      return 3 / 4;
    default:
      return 1;
  }
};

export const normalizeThumb = (s: ThumbnailSettings) => {
  const fit = (["cover", "contain", "fill"] as string[]).includes(s.thumbnail_fit || "")
    ? (s.thumbnail_fit as ThumbFit)
    : "cover";
  const position = (["center", "top", "bottom", "left", "right"] as string[]).includes(
    s.thumbnail_position || ""
  )
    ? (s.thumbnail_position as ThumbPosition)
    : "center";
  const zoomRaw = Number(s.thumbnail_zoom);
  const zoom = Number.isFinite(zoomRaw) && zoomRaw > 0 ? Math.min(Math.max(zoomRaw, 0.8), 1.6) : 1;
  const ratio = (["1:1", "4:3", "3:4"] as string[]).includes(s.thumbnail_ratio || "")
    ? (s.thumbnail_ratio as ThumbRatio)
    : "1:1";
  return { url: s.thumbnail_url || "", fit, position, zoom, ratio, bg: s.thumbnail_bg || "" };
};

/** Style untuk elemen <img> thumbnail. */
export const thumbImageStyle = (s: ThumbnailSettings): React.CSSProperties => {
  const { fit, position, zoom } = normalizeThumb(s);
  return {
    objectFit: fit,
    objectPosition: position,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    transformOrigin: position,
  };
};
