## Report Center Final Revisi

Tidak mengubah database, endpoint, atau definisi laporan existing. Semua perubahan bersifat UI/UX + ekstensi `config` JSON pada template (kolom `config` jsonb sudah ada).

---

### 1. Sidebar — `src/config/dashboardMenu.ts`
Hapus seluruh `children` dari item "Daftar Laporan" sehingga menjadi item flat tunggal:
```
{ title: "Daftar Laporan", url: "/dashboard/reports", icon: FileBarChart }
```
Tidak ada submenu kategori. Klik langsung membuka Report Center.

---

### 2. Report Center — `ReportsOverview.tsx`
Susun ulang halaman `/dashboard/reports` sesuai urutan kategori final:

```text
⭐ Favorit                (virtual — pinned + favorite)
📈 Penjualan & Booking   → /dashboard/reports/sales
💰 Keuangan              → /dashboard/reports/finance
💳 Pembayaran            → /dashboard/reports/payments
👥 Pelanggan (CRM)       → /dashboard/reports/customers
🚗 Kendaraan & Servis    → /dashboard/reports/vehicles
🎁 Loyalty & Rewards     → /dashboard/reports/loyalty
🏷 Promo & Voucher       → /dashboard/reports/promos
🏢 Operasional Cabang    → /dashboard/reports/operations
📋 Custom Report         → /dashboard/reports/builder
```

Kategori extra ("Respon Rate Admin", "Referral", "Inventory", "Purchasing", "Adopsi Platform") di-render di section sekunder "Kategori Lainnya" agar tidak menambah noise — tetap dapat dibuka, tidak ada laporan yang hilang.

Bug fix navigasi: setiap card menggunakan handler `navigate('/dashboard/reports/' + c.id)` yang sudah cocok dengan route `reports/:category`. Verifikasi 10 kategori inti memiliki minimal 1 laporan di `ReportRegistry` — kategori dengan `reportsByCategory(id).length === 0` ditandai "Segera Hadir" dan dinonaktifkan (mencegah blank page).

---

### 3. Favorit & Pin Report
Karena DB tidak boleh diubah, "Pin" disimpan client-side per user di `localStorage`:

- Key: `reports:pins:{userId}` → `string[]` (report id atau `builder:{templateId}`)
- Hook baru `src/hooks/useReportPins.ts` (get / toggle / list).
- Favorite template tetap pakai kolom `is_favorite` di `report_templates` (sudah ada).
- Kategori "Favorit" = gabungan: report dengan id ter-pin + template `is_favorite=true`.

UI:
- `ReportDetailPage` & `ReportBuilderPage` → tambah tombol ⭐ Favorit (template) & 📌 Pin (laporan/template aktif) di header action bar.
- `ReportsOverview` → render section "Favorit" paling atas; jika kosong, sembunyikan.

---

### 4. Edit Template (standard report)
Saat ini `ReportDetailPage` hanya menyimpan `timeline + branch` ke template. Diperluas tanpa membuat laporan baru:

Tambah komponen `ReportCustomizeSheet.tsx` (Sheet kanan) berisi:
- Pilih kolom tampil + urutan (drag-handle / move up-down)
- Sort by column + asc/desc
- Group by column (opsional — render subtotal per grup)
- Filter sederhana per kolom (text contains / equals untuk string, range untuk number, date range untuk date)

State customization disimpan di local state + di-merge ke `config.customization` saat user klik "Simpan Template". `ReportTable` & exporter membaca kolom hasil customization (bukan registry mentah). Definisi laporan original tidak diubah — hanya view layer yang dimodifikasi.

`useReportTemplates` sudah punya `update(id, patch)`. Tombol baru "Simpan Perubahan" muncul bila membuka template existing (`?template=...`).

---

### 5. Custom Report Builder
`ReportBuilderPage` sudah Accurate-style (data source / rows / measures / calc fields / filters / timeline / branch / save template). Tidak ada perubahan logika, hanya:

- Tambah tombol "Simpan sebagai Template Global" (muncul untuk Owner) — meneruskan `is_global: true` ke `TemplateSaveDialog`.
- Tambah tombol 📌 Pin agar template builder bisa dipin ke Favorit.

---

### 6. Personal Template Panel — `TemplatesPanel.tsx`
- Tambah tombol "Edit" (rename + toggle global jika owner) memanggil `update()`.
- Tampilkan section "Pinned" terpisah dari "Template Saya".
- Hapus dialog konfirmasi double — sudah ada `confirm()`.

---

### 7. Owner Template — `TemplateSaveDialog.tsx`
- Tambah checkbox "Publish sebagai Template Global" hanya untuk role `owner` (cek via `useUserRole().canManageFinancial` + role owner).
- Insert/update meneruskan `is_global` (kolom sudah ada, RLS sudah memperbolehkan staff/owner).

---

### 8. Validasi & Dedupe
- Pastikan tiap kategori 10 inti merender minimal 1 laporan. Jika tidak ada di `ReportRegistry`, kartu kategori dinonaktifkan (tidak navigasi → tidak blank).
- `ALL_REPORTS` sudah unique per `id` (registry). Tidak ada duplikasi.
- Tidak menghapus laporan existing; hanya UI yang difilter ke kategori inti.

---

### File yang Disentuh
- `src/config/dashboardMenu.ts` — hapus children Daftar Laporan
- `src/components/admin/reports/ReportsOverview.tsx` — urutan kategori final + section Favorit + Custom Report card
- `src/components/admin/reports/ReportCategoryPage.tsx` — guard kategori kosong
- `src/components/admin/reports/ReportDetailPage.tsx` — tombol Pin, Favorit, dan "Customize" (Sheet)
- `src/components/admin/reports/ReportCustomizeSheet.tsx` (baru)
- `src/components/admin/reports/ReportTable.tsx` — dukung kolom hasil customization + group/subtotal
- `src/components/admin/reports/templates/TemplatesPanel.tsx` — section Pinned + tombol Edit
- `src/components/admin/reports/templates/TemplateSaveDialog.tsx` — toggle Global untuk owner
- `src/components/admin/reports/builder/ReportBuilderPage.tsx` — tombol Pin & Save Global
- `src/hooks/useReportPins.ts` (baru) — localStorage pin tracker

### Yang TIDAK Diubah
- Tabel `report_templates`, RLS, edge function, definisi `REPORTS` / `EXTRA_REPORTS`, dan endpoint Supabase apa pun.
