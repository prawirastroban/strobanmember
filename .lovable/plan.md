## Goal

Pastikan setiap menu yang muncul di sidebar dashboard juga otomatis tampil sebagai tile di Overview (`DashboardMenuGrid`). Saat menu baru ditambahkan, cukup tambahkan di satu file dan sidebar + overview ikut update otomatis.

## Penyebab masalah saat ini

- Daftar menu sidebar didefinisikan di `src/components/admin/AdminSidebar.tsx` (array `menuItems`).
- Daftar tile overview didefinisikan terpisah di `src/components/admin/DashboardMenuGrid.tsx` (array `sections`).
- Dua sumber data ini sering tidak sinkron. Saat ini tile yang hilang di overview antara lain: **Keluhan Kendaraan** (sub CRM), **Permintaan Koreksi**, **PWA & Install**, semua sub Marketing (Overview), semua sub Daftar Laporan, semua sub Keuangan (Financial Report, Pembayaran Manual, Referral & Komisi).

## Solusi

Buat satu file konfigurasi `src/config/dashboardMenu.ts` sebagai sumber tunggal, lalu konsumsi dari Sidebar dan Overview.

### 1. File baru: `src/config/dashboardMenu.ts`

Berisi tipe + array tunggal `dashboardMenu`. Tiap item punya field:

- `title`, `url`, `icon`
- `requiredRole?: "owner" | "no_branch"`
- `section: "operasional" | "marketing" | "lainnya"` (untuk grouping di overview)
- `children?: MenuItem[]` (untuk sidebar collapsible)
- `hideInOverview?: boolean` (opsional, untuk pengecualian khusus seperti node parent yang murni grouping)
- `hideInSidebar?: boolean` (opsional)

Helper yang diekspor:

- `getVisibleMenu(roleFlags)` — filter berdasarkan role (logika `passesRole` dipindahkan ke sini).
- `getOverviewTiles(roleFlags)` — flatten: untuk item dengan children, kembalikan children sebagai tile terpisah; untuk item leaf kembalikan apa adanya. Auto-skip yang `hideInOverview`. Otomatis dikelompokkan per `section`.

Isi awalnya = gabungan menu sidebar saat ini, plus penandaan `section` untuk tiap item dan tiap child. Contoh:

- `Confirmation Bookings` → operasional
- `CRM` (parent + child `Keluhan Kendaraan`) → operasional
- `Kapasitas Slot`, `Customers & Vehicles`, `Pengaturan Cabang`, `Pick-up Service` → operasional
- `Marketing` + 6 child (Overview, Services, Promo, Loyalty, Rewards, Branding & Logo) → marketing
- `Transaction History`, `Daftar Laporan` + 9 child, `Keuangan` + 4 child, `Legal & Dokumen`, `Audit Log`, `Permintaan Koreksi`, `Bug & Masukan`, `PWA & Install` → lainnya

### 2. Refactor `src/components/admin/AdminSidebar.tsx`

- Hapus deklarasi lokal `menuItems` dan tipe `MenuItem`; impor dari `@/config/dashboardMenu`.
- Ganti `visibleItems` agar menggunakan `getVisibleMenu({ isStaff, isAdminCabang })`.
- Tidak ada perubahan visual lain.

### 3. Refactor `src/components/admin/DashboardMenuGrid.tsx`

- Hapus konstanta lokal `sections`/`Tile`.
- Panggil `getOverviewTiles({ isStaff: isStaff })` (sudah ada `useUserRole`).
- Render 3 section sesuai key (`operasional` → "Operasional" hijau, `marketing` → "Marketing" biru, `lainnya` → "Lainnya" violet) dengan style tile yang sama seperti sekarang (warna tone tidak berubah).
- Badge tetap dipakai dari `useDashboardBadges` seperti sekarang.

### 4. Dokumentasi singkat

Tambahkan komentar header di `dashboardMenu.ts`:

```
// SUMBER TUNGGAL menu dashboard.
// Menambah menu baru: cukup tambah entry di sini.
// - Sidebar (AdminSidebar) dan Overview (DashboardMenuGrid) akan otomatis menampilkannya.
// - Set `section` untuk menentukan kolom Overview.
// - Set `hideInOverview` / `hideInSidebar` jika perlu menyembunyikan di salah satu tempat.
```

## File yang berubah

- **Tambah**: `src/config/dashboardMenu.ts`
- **Edit**: `src/components/admin/AdminSidebar.tsx` (impor dari config, hapus array lokal)
- **Edit**: `src/components/admin/DashboardMenuGrid.tsx` (impor dari config, hapus array lokal)

Tidak ada perubahan route, DB, atau styling visual.
