/**
 * Aturan tunggal kelayakan promo/voucher terhadap layanan yang dipilih.
 *
 * - `applicable_service_ids` terisi  -> HANYA layanan tersebut yang berlaku
 *   (kategori diabaikan sepenuhnya).
 * - `applicable_service_ids` kosong  -> pakai filter `applicable_categories`.
 * - Keduanya kosong                  -> berlaku untuk semua layanan.
 */
export const isServiceScoped = (serviceIds?: string[] | null) =>
  (serviceIds ?? []).length > 0;

export const isPromoEligible = (
  applicableCategories: string[] | null | undefined,
  applicableServiceIds: string[] | null | undefined,
  selectedCategories: string[] | undefined,
  selectedServiceIds: string[] | undefined,
): boolean => {
  const cats = applicableCategories ?? [];
  const svcs = applicableServiceIds ?? [];
  if (cats.length === 0 && svcs.length === 0) return true;

  const selCats = selectedCategories ?? [];
  const selSvcs = selectedServiceIds ?? [];
  // Belum memilih apa pun -> anggap eligible (validasi final saat apply).
  if (selCats.length === 0 && selSvcs.length === 0) return true;

  // Layanan spesifik menang atas kategori.
  if (svcs.length > 0) return selSvcs.some((id) => svcs.includes(id));
  return selCats.some((c) => cats.includes(c));
};

/** Bersihkan payload sebelum simpan: layanan spesifik menang atas kategori. */
export const normalizeScope = (
  categories: string[],
  serviceIds: string[],
): { applicable_categories: string[]; applicable_service_ids: string[] } => ({
  applicable_categories: serviceIds.length > 0 ? [] : categories,
  applicable_service_ids: serviceIds,
});

/** Rincian layanan terpilih di keranjang/booking. */
export interface SelectedServiceItem {
  id: string;
  category?: string | null;
  price: number;
  qty?: number;
}

/**
 * Total harga layanan yang termasuk cakupan promo.
 * - Dibatasi layanan spesifik -> hanya layanan tersebut.
 * - Dibatasi kategori         -> hanya layanan pada kategori tersebut.
 * - Tanpa batasan             -> seluruh layanan.
 */
export const eligibleAmountFor = (
  applicableCategories: string[] | null | undefined,
  applicableServiceIds: string[] | null | undefined,
  items: SelectedServiceItem[] | undefined,
): number => {
  const cats = applicableCategories ?? [];
  const svcs = applicableServiceIds ?? [];
  const list = items ?? [];
  const inScope = list.filter((it) => {
    if (svcs.length > 0) return svcs.includes(it.id);
    if (cats.length > 0) return it.category ? cats.includes(it.category) : false;
    return true;
  });
  return inScope.reduce((sum, it) => sum + Number(it.price || 0) * (it.qty ?? 1), 0);
};

/**
 * Cek minimal transaksi. Mengembalikan kekurangan (shortfall) bila belum memenuhi.
 * Bila belum ada layanan dipilih, dianggap lolos (validasi final saat apply).
 */
export const checkMinPurchase = (
  minPurchase: number | null | undefined,
  applicableCategories: string[] | null | undefined,
  applicableServiceIds: string[] | null | undefined,
  items: SelectedServiceItem[] | undefined,
): { ok: boolean; amount: number; min: number; shortfall: number } => {
  const min = Number(minPurchase || 0);
  const list = items ?? [];
  if (min <= 0 || list.length === 0) {
    return { ok: true, amount: 0, min, shortfall: 0 };
  }
  const amount = eligibleAmountFor(applicableCategories, applicableServiceIds, list);
  return { ok: amount >= min, amount, min, shortfall: Math.max(0, min - amount) };
};

export const formatIDRShort = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;