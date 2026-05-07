import { formatRupiah } from "./reportFormat";

/**
 * Format harga layanan. Jika harga = 0 (atau null/negatif), tampilkan "FREE".
 * Digunakan di seluruh tampilan harga per-item layanan (katalog, booking,
 * ringkasan, history). Total/subtotal/laporan tetap pakai formatRupiah.
 */
export const formatServicePrice = (value: number | null | undefined): string => {
  const n = Number(value) || 0;
  if (n <= 0) return "FREE";
  return formatRupiah(n);
};

export const isFreeService = (value: number | null | undefined): boolean => {
  return (Number(value) || 0) <= 0;
};