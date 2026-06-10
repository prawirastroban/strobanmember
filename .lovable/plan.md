## Tujuan
Quick Access saat ini hanya mengurutkan menu berdasarkan frekuensi klik (`useTopMenus`). Tambahkan rule baru: menu yang memiliki **badge prioritas aksi > 0** (pending booking, keluhan baru, pembayaran pending, user belum verifikasi, promo expired) harus **selalu muncul lebih dulu** di Quick Access, di atas menu yang sekadar sering diklik.

## Rule Prioritas Baru

Urutan akhir Quick Access menjadi:

1. **Tier 1 — Butuh Aksi (priority):** Semua menu dengan `badgeFor(url) > 0`, diurutkan menurun berdasarkan besar badge (badge terbesar = paling urgent). Jika seri, fallback ke jumlah klik.
2. **Tier 2 — Sering Dipakai:** Menu lain yang tersisa, diurutkan oleh `usage.count` (perilaku saat ini).
3. **Tier 3 — Default Seed:** Fallback jika belum cukup mencapai `limit`.

Hasil tetap dibatasi `limit` (default 5) dan tetap melewati cek `passesRole` + `hideInOverview`.

## Indikator Visual
Tile yang masuk karena prioritas aksi (Tier 1) sudah otomatis menampilkan badge merah bulat. Tambahkan **ring/glow halus** (`ring-1 ring-[hsl(0_95%_55%)]/40`) pada tile prioritas agar mudah dibedakan dari tile "sering dipakai".

## Files yang Diubah

### `src/hooks/useMenuUsage.ts`
- `useTopMenus` menerima parameter tambahan opsional `priorityBadges?: (url: string) => number`.
- Bangun daftar kandidat dari **semua menu yang bisa lolos role** (bukan hanya yang ada di `usage`) supaya menu yang belum pernah diklik tapi punya badge tetap bisa muncul.
- Logika sort:
  - kandidat dengan `badge > 0` → Tier 1 (sort: badge desc, lalu usage desc, lalu lastUsed desc)
  - lainnya → Tier 2 (sort: usage.count desc, lastUsed desc)
  - sisanya → Tier 3 (DEFAULT_SEED)
- `MenuItem` yang dikembalikan ditambah flag transient `__priority?: boolean` (atau kembalikan tuple `{ item, priority, badge }` untuk lebih bersih).

### `src/components/admin/DashboardHomeBlocks.tsx` → `QuickAccessGrid`
- Panggil `useTopMenus(5, flags, badgeFor)` (oper `badgeFor` dari `useDashboardBadges`).
- Saat me-render tile, jika `priority === true`, tambahkan class `ring-1 ring-[hsl(0_95%_55%)]/40 shadow-[0_0_12px_hsl(0_95%_55%/0.15)]`.
- Title section tetap `Quick Access · Sering Dipakai`. Tidak perlu pisah heading; cukup tonjolkan via ring.

## Tidak Diubah
- Tidak ada perubahan DB / edge function.
- Tidak ada perubahan `useDashboardBadges` — sudah menyediakan `badgeFor`.
- Section "Perlu Perhatian" tetap independen (detail rincian aksi, bukan shortcut menu).