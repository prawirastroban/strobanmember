---
name: Global Navigation Rule (Feature Completion Checklist)
description: Permanent project standard. Dashboard is the single source of navigation — every new operational page must be reachable from Dashboard menu, with route, permission, breadcrumb, icon, mobile nav, and full state coverage.
type: preference
---
**Rule (permanent, no exceptions):** Dashboard adalah Single Source of Navigation. Tidak boleh ada orphan page/route atau fitur yang hanya bisa diakses via URL langsung.

**Setiap page baru WAJIB memenuhi checklist berikut sebelum dianggap selesai:**

1. **Route** — daftarkan di `src/App.tsx`.
2. **Page Registry** — tambahkan entry di `src/config/pageRegistry.ts` (status ACTIVE, scope tepat).
3. **Dashboard Menu** — tambahkan `MenuItem` di `src/config/dashboardMenu.ts` pada kategori yang sesuai (Operasional / Pelanggan / Marketing / Keuangan / Laporan / Pengaturan / Pusat Kontrol).
4. **Icon** — gunakan `lucide-react` yang konsisten dengan menu lain sekategori.
5. **Role Permission** — set `requiredRole` (`owner` / `no_branch`) atau proteksi via `AdminRoute` / `ProtectedRoute`.
6. **Breadcrumb** — tambahkan label segmen ke `src/components/admin/drill/Breadcrumbs.tsx`.
7. **Mobile Navigation** — perbarui `MobileNav.tsx` / `BottomNav.tsx` bila fitur relevan untuk mobile user.
8. **Loading State** — skeleton/spinner saat data fetch.
9. **Empty State** — copy + ikon saat data kosong.
10. **Error State** — pesan retry saat gagal fetch/aksi.

**How to apply:** Sebelum menyatakan sebuah fitur/page selesai, lakukan self-audit terhadap 10 poin di atas. Jika salah satu belum ada, fitur BELUM selesai.

**Why:** Menghindari orphan page, memastikan discoverability sesuai hak akses, dan menjaga konsistensi UX lintas halaman.