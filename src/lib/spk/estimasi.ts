// Helper bersama untuk estimasi pergantian spareparts.
// Sumber data tunggal: spk_orders.data -> estimasi_items / estimasi_diskon_*.
import type { EstimasiItem } from "@/components/spk/canvas/v2/EstimasiEditor";

export const ESTIMASI_KEYS = {
  items: "estimasi_items",
  diskonJasa: "estimasi_diskon_jasa",
  diskonSparepart: "estimasi_diskon_sparepart",
} as const;

export interface EstimasiSnapshot {
  items: EstimasiItem[];
  diskonJasa: number;
  diskonSparepart: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Ambil estimasi dari kolom `data` sebuah SPK (aman untuk data lama/null). */
export function parseEstimasi(data: unknown): EstimasiSnapshot {
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const rawItems = Array.isArray(obj[ESTIMASI_KEYS.items]) ? (obj[ESTIMASI_KEYS.items] as unknown[]) : [];
  const items: EstimasiItem[] = rawItems
    .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
    .map((it, idx) => ({
      id: String(it.id ?? `it-${idx}`),
      nama: String(it.nama ?? ""),
      qty: num(it.qty),
      harga: num(it.harga),
      urgensi: (it.urgensi === "ok" || it.urgensi === "bad" ? it.urgensi : "") as EstimasiItem["urgensi"],
      approval: (it.approval === "yes" || it.approval === "no" ? it.approval : "") as EstimasiItem["approval"],
    }));
  return {
    items,
    diskonJasa: num(obj[ESTIMASI_KEYS.diskonJasa]),
    diskonSparepart: num(obj[ESTIMASI_KEYS.diskonSparepart]),
  };
}

/** Subtotal seluruh item (qty × harga), tanpa diskon. */
export function computeEstimasiSubtotal(items: EstimasiItem[]): number {
  return items.reduce((s, it) => s + num(it.qty) * num(it.harga), 0);
}

/** Total estimasi setelah diskon jasa & sparepart (tidak pernah negatif). */
export function computeEstimasiTotal(snapshot: EstimasiSnapshot): number {
  return Math.max(
    0,
    computeEstimasiSubtotal(snapshot.items) - num(snapshot.diskonJasa) - num(snapshot.diskonSparepart),
  );
}

/** Item yang benar-benar terisi (punya nama atau harga) — dipakai untuk badge. */
export function countFilledItems(items: EstimasiItem[]): number {
  return items.filter((it) => it.nama.trim().length > 0 || num(it.harga) > 0).length;
}
