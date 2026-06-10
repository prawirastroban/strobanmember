## Tujuan

Merombak Information Architecture dashboard agar mengikuti pola ERP modern (Accurate / Odoo / Mekari / SAP B1):
- Kategori menu fixed & konsisten (7 kategori, tanpa "Lainnya").
- Auto-categorization engine: setiap menu baru otomatis masuk kategori yang benar berdasarkan route/keyword.
- Halaman Home tidak lagi menampilkan semua menu — tampilkan KPI, Need Attention, dan Quick Access.

Tidak ada perubahan route, DB, role, policy, edge function, atau business logic. Hanya reorganisasi kategori, urutan menu, dan layout visual Home.

---

## 1. Mapping kategori lama → baru (untuk approval)

Kategori lama (3): `operasional`, `marketing`, `lainnya`.
Kategori baru (7) urutan tetap:

```
OPERASIONAL → PELANGGAN → MARKETING → KEUANGAN → LAPORAN → PENGATURAN → PUSAT KONTROL
```

| Menu (title) | Route | Lama | Baru |
|---|---|---|---|
| Confirmation Bookings | /dashboard/bookings | operasional | OPERASIONAL |
| Kapasitas Slot | /dashboard/slots | operasional | OPERASIONAL |
| Pick-up Service | /dashboard/pickup-settings | operasional | OPERASIONAL |
| QR Scanner (redirect ke bookings?action=scan) | /dashboard/scanner | — | OPERASIONAL (Quick Access) |
| CRM — Overview | /dashboard/crm | operasional | PELANGGAN |
| CRM — Keluhan Kendaraan | /dashboard/complaints | operasional | PUSAT KONTROL *(keluhan = kontrol, bukan CRM)* |
| Customers & Vehicles | /dashboard/customers | operasional | PELANGGAN |
| Marketing — Overview | /dashboard/marketing | marketing | MARKETING |
| Marketing — Services | /dashboard/marketing/services | marketing | MARKETING |
| Marketing — Promos | /dashboard/marketing/promos | marketing | MARKETING |
| Marketing — Loyalty | /dashboard/marketing/loyalty | marketing | PELANGGAN *(loyalty = pelanggan)* |
| Marketing — Rewards | /dashboard/marketing/rewards | marketing | MARKETING |
| Marketing — Branding & Logo | /dashboard/marketing/branding | marketing | MARKETING |
| Transaction History | /dashboard/history | lainnya | KEUANGAN |
| Daftar Laporan — Overview | /dashboard/reports | lainnya | LAPORAN |
| Daftar Laporan — Penjualan & Booking | /dashboard/reports/sales | lainnya | LAPORAN |
| Daftar Laporan — Keuangan | /dashboard/reports/finance | lainnya | LAPORAN |
| Daftar Laporan — Pembayaran | /dashboard/reports/payments | lainnya | LAPORAN |
| Daftar Laporan — Pelanggan (CRM) | /dashboard/reports/customers | lainnya | LAPORAN |
| Daftar Laporan — Kendaraan & Servis | /dashboard/reports/vehicles | lainnya | LAPORAN |
| Daftar Laporan — Loyalty & Rewards | /dashboard/reports/loyalty | lainnya | LAPORAN |
| Daftar Laporan — Promo & Voucher | /dashboard/reports/promos | lainnya | LAPORAN |
| Daftar Laporan — Operasional Cabang | /dashboard/reports/operations | lainnya | LAPORAN |
| Keuangan — Financial Report | /dashboard/keuangan/report | lainnya | KEUANGAN |
| Keuangan — Payments | /dashboard/keuangan/payment | lainnya | KEUANGAN |
| Keuangan — Pembayaran Manual | /dashboard/keuangan/manual-payment | lainnya | KEUANGAN |
| Keuangan — Referral & Komisi | /dashboard/keuangan/referral | lainnya | KEUANGAN |
| Pengaturan Cabang | /dashboard/branches | operasional | PENGATURAN |
| Legal & Dokumen | /dashboard/legal | lainnya | PENGATURAN |
| Audit Log | /dashboard/audit-log | lainnya | PENGATURAN |
| PWA & Install | /dashboard/pwa-settings | lainnya | PENGATURAN |
| Permintaan Koreksi | /dashboard/correction-requests | lainnya | PUSAT KONTROL |
| Bug & Masukan | /dashboard/feedback | lainnya | PUSAT KONTROL |

Catatan keputusan:
- **Keluhan Kendaraan** dipindah dari OPERASIONAL → PUSAT KONTROL agar konsisten dengan "Permintaan Koreksi" & "Bug" (semuanya antrian aksi/eskalasi).
- **Loyalty** masuk PELANGGAN (retensi pelanggan), Rewards tetap MARKETING (katalog/penawaran).
- **Transaction History** masuk KEUANGAN (riwayat transaksi pembayaran).
- Tidak ada lagi bucket "LAINNYA".

Jika ada keberatan terhadap salah satu pemetaan di atas (mis. ingin Loyalty tetap MARKETING, atau Keluhan tetap di OPERASIONAL), beri tahu sebelum approve — implementasi akan mengikuti.

---

## 2. Auto-categorization engine

File: `src/config/dashboardMenu.ts` (sudah ada, akan diperluas).

- Ganti tipe `DashboardSection` menjadi 7 kategori:
  `"operasional" | "pelanggan" | "marketing" | "keuangan" | "laporan" | "pengaturan" | "pusat_kontrol"`.
- Tambah fungsi `inferSection(url, title)` dengan urutan prioritas:

```
1. Override eksplisit `section` di item → pakai itu.
2. Match URL prefix:
   /dashboard/bookings, /slots, /pickup, /scanner            → operasional
   /dashboard/customers, /crm, /loyalty, /vehicles           → pelanggan
   /dashboard/marketing (kecuali /loyalty)                   → marketing
   /dashboard/keuangan, /history, /payments                  → keuangan
   /dashboard/reports                                        → laporan
   /dashboard/branches, /legal, /audit-log, /pwa-settings    → pengaturan
   /dashboard/complaints, /correction-requests, /feedback    → pusat_kontrol
3. Match title keyword (fallback):
   booking|slot|pickup|scanner            → operasional
   customer|crm|pelanggan|loyalty|vehicle → pelanggan
   service|promo|reward|branding          → marketing
   payment|finance|keuangan|commission|komisi|invoice → keuangan
   report|laporan|analytic|kpi            → laporan
   branch|cabang|legal|audit|pwa|install  → pengaturan
   correction|feedback|bug|complaint|keluhan|koreksi → pusat_kontrol
4. Jika tetap tidak match → log warning dev-only, default ke "pengaturan".
```

- `section` di tiap entry menjadi **opsional**; default-nya hasil `inferSection`. Field tetap boleh dipakai untuk override (mis. Keluhan).
- Tambah unit-friendly: file mengekspor `inferSection` agar bisa diuji manual.
- `SECTION_META` diperluas ke 7 kategori dengan urutan tetap.
- `getOverviewTiles` & `getVisibleMenu` tidak berubah signature; output bucket-nya jadi 7.

Hasil: **menambah menu baru cukup tulis `{ title, url, icon }`** — kategori otomatis terisi. Override `section` hanya bila perlu.

---

## 3. Sidebar (`src/components/admin/AdminSidebar.tsx`)

- Mengelompokkan item per kategori (saat ini flat). Setiap kategori jadi `SidebarGroup` dengan `SidebarGroupLabel` = nama kategori.
- Urutan grup mengikuti urutan kategori (OPERASIONAL → … → PUSAT KONTROL).
- Tidak ada perubahan style/collapse behavior.

---

## 4. Dashboard Home (`src/components/admin/AdminDashboard.tsx` + `DashboardMenuGrid.tsx`)

Home **tidak lagi** menampilkan semua menu. Layout baru 3 blok:

### A. KPI Cards (4 kartu)
- **Booking Hari Ini** — count `bookings` dengan `booking_date = today` (cabang-scoped untuk admin_cabang).
- **Pending Confirmation** — count `bookings` status `pending|waiting_confirmation`.
- **Slot Tersedia** — sisa slot hari ini dari `useSlotAvailability` (atau query langsung `slot_capacity`).
- **Pendapatan Hari Ini** — sum `payments.amount` paid hari ini.

Gunakan `useDashboardBadges` yang sudah ada di-extend jika perlu, query via supabase client. Skeleton saat loading.

### B. Need Attention (list, max 5 per kategori, hanya yang >0)
- Booking terlambat konfirmasi (created_at > 30 menit & masih pending).
- Keluhan kendaraan baru (`status='new'`).
- Permintaan koreksi pending.
- Bug kritikal (`internal_reports` category=bug, status=open).

Tiap row = icon + label + count badge + tombol "Lihat" → navigate ke route terkait. Reuse `actionPriority`/`isActionNeeded` dari `src/lib/actionNeeded.ts`.

### C. Quick Access (5 tile besar)
Tile fixed (diambil dari config dashboardMenu by url):
`Booking`, `Customer`, `CRM`, `Laporan`, `Keuangan`.

Style sama dengan tile existing (glass + tone color). `DashboardMenuGrid` lama dipensiunkan (file dihapus) — diganti komponen ringan `QuickAccessGrid` dalam `AdminDashboard.tsx`.

---

## 5. File yang berubah

- **Edit**: `src/config/dashboardMenu.ts` — 7 kategori + `inferSection` + `section` opsional.
- **Edit**: `src/components/admin/AdminSidebar.tsx` — render per kategori.
- **Edit**: `src/components/admin/AdminDashboard.tsx` — layout baru (KPI + Need Attention + Quick Access).
- **Hapus**: `src/components/admin/DashboardMenuGrid.tsx` (diganti komponen quick access di dalam AdminDashboard).
- **Tidak diubah**: `src/pages/Admin.tsx` (routes), DB, RLS, edge function, role.

---

## 6. Safety check

- Semua route lama tetap hidup di `Admin.tsx`.
- Tidak ada perubahan policy/permission — guard `OwnerOnly` / `NoBranchOnly` & `requiredRole` di config tetap.
- Tidak ada migrasi DB.
- Auto-categorization murni computed di FE.

Mohon konfirmasi mapping di tabel Section 1 (terutama Loyalty, Keluhan, Transaction History) sebelum saya implementasi.