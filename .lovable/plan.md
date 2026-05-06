## Daftar Laporan (Reports Hub) — Accurate-style

Panel baru di sidebar dashboard yang berisi katalog laporan terorganisir per divisi/menu, dengan halaman detail laporan yang interaktif (filter timeline, kolom dinamis, ringkasan KPI) dan tombol **Export Excel** + **Export PDF** di setiap laporan.

### 1. Sidebar (collapsible group baru)

Tambah item baru di `src/components/admin/AdminSidebar.tsx` (di atas "Transaction History"):

```
Daftar Laporan  (icon: FileBarChart)
├── Overview                 /dashboard/reports
├── Penjualan & Booking      /dashboard/reports/sales
├── Keuangan                 /dashboard/reports/finance
├── Pembayaran               /dashboard/reports/payments
├── Pelanggan (CRM)          /dashboard/reports/customers
├── Kendaraan & Servis       /dashboard/reports/vehicles
├── Loyalty & Rewards        /dashboard/reports/loyalty
├── Promo & Voucher          /dashboard/reports/promos
└── Operasional Cabang       /dashboard/reports/operations
```

`requiredRole: "no_branch"` (Owner + CS; admin_cabang otomatis ter-scope by RLS bila dibuka — opsional juga bisa dibatasi).

### 2. Routing

Di `src/pages/Admin.tsx` tambah:
```
/dashboard/reports                  → ReportsOverview
/dashboard/reports/:category        → ReportCategoryPage
/dashboard/reports/:category/:id    → ReportDetailPage
```

### 3. Struktur file baru

```
src/components/admin/reports/
├── ReportsOverview.tsx        # grid kartu kategori (mirip Accurate "Daftar Laporan")
├── ReportCategoryPage.tsx     # list laporan dalam 1 kategori (judul + deskripsi + tombol Buka)
├── ReportDetailPage.tsx       # render laporan terpilih (data + filter + export)
├── ReportRegistry.ts          # daftar definisi semua laporan (id, kategori, judul,
│                                deskripsi, kolom, query loader, KPI calculator)
├── ReportTable.tsx            # tabel reusable (sorting, total row, sticky header)
├── ReportFilters.tsx          # FilterBar timeline + branch + status (re-pakai pola FilterBar)
├── ReportKPIStrip.tsx         # ringkasan KPI di atas tabel
└── exporters/
    ├── exportToExcel.ts       # pakai SheetJS (xlsx)
    └── exportToPdf.ts         # pakai jsPDF + jspdf-autotable
```

### 4. Daftar laporan awal (per kategori)

**Penjualan & Booking**
- Ringkasan Booking (per tanggal, status, cabang)
- Booking per Layanan (qty, revenue, avg ticket)
- Booking per Cabang
- Conversion Funnel (pending → confirmed → completed → cancelled)

**Keuangan**
- Laporan Pendapatan (harian/mingguan/bulanan)
- Pendapatan per Layanan
- Pendapatan per Cabang
- Outstanding / Piutang (invoice unpaid)

**Pembayaran**
- Daftar Pembayaran (semua transaksi + metode)
- Rekap Metode Pembayaran (cash/transfer/QRIS/Midtrans)
- Pembayaran Pending & Gagal
- Webhook Log Summary

**Pelanggan (CRM)**
- Customer Baru per Periode
- Top Customer by Spend
- Customer Tidak Aktif (>90 hari)
- Verified vs Unverified

**Kendaraan & Servis**
- Kendaraan Terdaftar
- Servis per Brand/Model
- Reminder Servis Jatuh Tempo
- Riwayat Keluhan (vehicle_complaints)

**Loyalty & Rewards**
- Rekap Poin (earn vs redeem)
- Top Earner / Top Redeemer
- Reward Redemption Log

**Promo & Voucher**
- Performa Promo (claims, used, conversion)
- Voucher Aktif vs Kadaluarsa

**Operasional Cabang**
- Utilisasi Slot (booked vs capacity)
- Durasi Servis (avg dari booking_status_logs)
- Performa per Cabang (booking, revenue, rating)

### 5. Behavior tiap laporan (Accurate-style)

Setiap `ReportDetailPage` punya:
- **Header**: judul + breadcrumb (`Daftar Laporan / {Kategori} / {Nama Laporan}`)
- **Filter bar**: Timeline preset (today, this_week, this_month, this_quarter, this_year, custom) + Branch dropdown + filter spesifik laporan (mis. status, metode bayar). Re-pakai `src/utils/timelineFilter.ts`.
- **KPI strip**: 3–5 angka ringkas (Total, Avg, Growth%, dsb).
- **Tabel**: sortable, pagination client-side, baris total di bawah, kolom angka right-aligned, format Rupiah `Rp 150.000`, tanggal `15 Oct 2023`.
- **Toolbar kanan atas**: tombol `Refresh` · `Export Excel` · `Export PDF`.
- **Loading skeleton** saat fetch.

### 6. Export

- **Excel**: install `xlsx` (SheetJS). `exportToExcel(rows, columns, filename)` membuat workbook 1 sheet dengan header bold, kolom auto-fit, baris total.
- **PDF**: install `jspdf` + `jspdf-autotable`. `exportToPdf(rows, columns, meta)` menghasilkan PDF A4 landscape: kop laporan (logo brand + nama laporan + periode + cabang + dicetak oleh + timestamp), tabel autoTable, footer page X of Y. Logo & brand diambil dari `useBranding()`.

Nama file: `{report_id}_{YYYYMMDD-HHmm}.xlsx|pdf`.

### 7. Data fetching

Tiap laporan punya loader async di `ReportRegistry.ts`:
```ts
{
  id: 'sales-summary',
  category: 'sales',
  title: 'Ringkasan Booking',
  description: '...',
  columns: [...],
  load: async ({ from, to, branch }) => { /* supabase queries */ return rows; },
  kpis: (rows) => [...],
}
```
Query memakai client Supabase yang sudah ada; RLS otomatis membatasi data per role (admin_cabang hanya cabangnya).

### 8. Akses & izin

- Akses panel: `isAdminOrStaff` (semua role admin). Untuk laporan keuangan sensitif, hide bila `!canManageFinancial` (kategori Keuangan & Pembayaran).
- Tidak menyentuh schema DB — murni read.

### 9. Dependencies baru

- `xlsx` (SheetJS community)
- `jspdf`
- `jspdf-autotable`

### Detail teknis ringkas

- Reuse pola `FilterBar` dari `src/components/admin/filters/FilterBar.tsx` & `timelineFilter.ts` agar konsisten dengan BookingsManager dll.
- Format angka & tanggal pakai helper bersama (buat `src/lib/reportFormat.ts` jika belum ada): `formatRupiah`, `formatDateID`.
- `ReportsOverview` desain bento-grid kartu kategori dengan icon Lucide + jumlah laporan di dalamnya — match style "liquid glass" project (red neon hover #ff2b2b).
- Mobile: tabel scroll horizontal (sudah pattern di project).
- Tidak ada perubahan auth/RLS/migration.

### Out of scope (bisa dikerjakan iterasi berikutnya)
- Scheduled report (kirim PDF via email otomatis).
- Saved filter presets per user.
- Pivot/drilldown interaktif.