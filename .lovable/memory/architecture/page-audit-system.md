---
name: Page Audit & Archive System
description: Single-source page registry, LegacyRedirect wrapper, archive folders, Owner-only audit panel at /dashboard/page-audit
type: feature
---
- `src/config/pageRegistry.ts` adalah sumber tunggal status semua route (ACTIVE/ARCHIVED/DEPRECATED/REDIRECTED). Setiap route baru wajib didaftarkan.
- Halaman yang tidak dipakai lagi dipindah ke `src/pages/_archive/` atau `src/components/admin/_archive/` — jangan dihapus, jangan diimpor dari kode aktif.
- URL lama tidak boleh memunculkan 404. Pakai `<LegacyRedirect to="/path/baru" />` (menampilkan toast "Halaman telah diperbarui ke versi terbaru") atau `<Navigate replace />` untuk redirect diam.
- `<Route path="*">` di `src/pages/Admin.tsx` mengarahkan URL dashboard tak dikenal ke `/dashboard` (bukan NotFound global).
- `SEOMeta.tsx` otomatis menyuntik `<meta name="robots" content="noindex, nofollow">` untuk pathname yang statusnya DEPRECATED/ARCHIVED.
- Panel laporan: `/dashboard/page-audit` (hidden, Owner only). Diakses dari tombol di `AppVersionManager`. Menampilkan KPI Total/Active/Archived/Deprecated/Redirected/Duplicate dan tabel detail + export CSV.
- Saat ini archived: `ServiceHistory.tsx` (diganti `/profile/history-perawatan`), `FinanceDashboard.tsx` (diganti `FinancialReport.tsx`).