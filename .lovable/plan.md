## Masalah Saat Ini

`FinanceDashboard.tsx` **tidak sinkron** dengan data riil:

- Filter `payment_status === "success" | "pending" | "failed"` — padahal DB hanya pakai `"paid"` / `"unpaid"` / `"pay_later"`. Akibatnya **Total Revenue selalu Rp 0** walau ada 54 pembayaran paid.
- Tidak membaca `discount_amount`, `cashback_used`, `pickup_fee`, `pickup_return_fee` — angka revenue meleset dari nilai sebenarnya.
- Tidak ikut `tire_orders` (penjualan ban via Midtrans tire-order) — padahal tabelnya ada dan dipakai modul checkout.
- Tidak ada timeline preset standar (today / this_month / last_month / dst.) seperti modul lain (BookingsManager, Reports Hub).
- Tidak ada filter cabang, padahal pemilik multi-cabang perlu breakdown per outlet.
- Analitik dangkal: hanya revenue harian/bulanan + 2 pie. Tidak ada AOV, gross vs net, pajak (jika ada), refund/cancel impact, top services, conversion, cashback liabilitas, dll.

## Tujuan

1. **Sinkron total** dengan semua transaksi keuangan (services + tires + pickup, dikurangi diskon & cashback).
2. **Filter terstandarisasi** (timeline preset + cabang) seperti modul lain.
3. **Overview lengkap** ala dashboard keuangan modern (KPI strip, tren, breakdown, top-list, kesehatan kas).

## Perubahan File

### 1. `src/components/admin/FinanceDashboard.tsx` (rewrite)

Layout baru (top → bottom):

```text
[ Filter Bar ]  timeline preset + branch dropdown + refresh

[ KPI Strip — 8 kartu ]
  Gross Revenue | Net Revenue | Diskon Diberikan | Cashback Terpakai
  Total Transaksi (paid) | AOV | Outstanding (unpaid) | Cashback Liability

[ Tren Revenue (Area chart, gabungan services+tires, stacked) ]
[ Tren Transaksi (Bar, paid vs unpaid vs pay_later per hari) ]

[ Breakdown (2 kolom) ]
  - Metode Pembayaran (Pie + legend nominal & %)
  - Sumber Revenue: Service vs Tire vs Pickup Fee (Pie)

[ Per Cabang (Bar horizontal) ] — revenue & jumlah transaksi
[ Top 10 Layanan Terlaris ] — tabel: nama, qty, revenue, %share
[ Top 10 Ban Terlaris ] — tabel: brand/model, qty, revenue
[ Status Pembayaran Outstanding ] — list invoice unpaid + umur (aging 0-7 / 8-30 / 30+ hari)
[ Laporan Harian ] — tabel yang sudah ada, ditambah kolom diskon & net
```

### 2. Sumber Data

Query paralel (semua difilter range tanggal + cabang opsional):

- `payments` — semua kolom; status valid: `paid`, `unpaid`, `pay_later`.
- `bookings` — `service_price, discount_amount, cashback_used, pickup_fee, pickup_return_fee, service_type, service_name, branch, payment_status, created_at`.
- `tire_orders` — `total_amount, status, payment_status, items, branch, created_at` (skip kalau tabel kosong, tampilkan 0).
- `invoices` — untuk aging outstanding (`payment_status='unpaid'`, umur dari `created_at`).
- `cashback_ledger` — `sum(amount) where type='credit' and redeemed=false` untuk liability.

### 3. Perhitungan

```text
gross_revenue   = Σ bookings.service_price (paid) + Σ tire_orders.total_amount (paid) + Σ pickup_fee + Σ pickup_return_fee
discounts_given = Σ bookings.discount_amount (paid)
cashback_used   = Σ bookings.cashback_used (paid)
net_revenue     = gross_revenue − discounts_given − cashback_used
aov             = net_revenue / paid_tx_count
outstanding     = Σ invoices.amount (unpaid) + Σ bookings.service_price (unpaid/pay_later)
```

Status mapping (legacy aman): treat `success` sebagai alias `paid`, `failed`/`cancelled` exclude.

### 4. UI / Style

- Reuse pola glass card `bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl` yang sudah ada.
- KPI strip pakai `ReportKPIStrip` look-alike (icon + label + value + delta vs periode sebelumnya).
- Tambah **delta % vs periode sebelumnya** di KPI utama (Gross, Net, Paid Tx, AOV) — query rentang sebelumnya yang sama panjang.
- Tooltip & format pakai `formatRupiah` dari `@/lib/reportFormat`.

### 5. Filter

- Pakai `FilterBar` + helper `src/utils/timelineFilter.ts` (preset default `this_month`) — konsisten dengan BookingsManager & Reports Hub.
- Dropdown cabang dari `useBranches()`.

### 6. Loading & Empty

- Skeleton di tiap section (bukan satu spinner global) supaya KPI muncul duluan saat data siap.
- Empty state per blok jika 0 baris.

## Yang Tidak Diubah

- Skema DB (tidak ada migration).
- Reports Hub (`/dashboard/reports`) tetap.
- `FinanceDashboard` lain (mis. `analytics/WebAnalyticsDashboard`) tidak disentuh.

## Validasi Setelah Build

1. Buka `/dashboard/finance` (atau menu Keuangan) → KPI **Total Revenue** harus muncul angka sesuai 54 payments `paid` di DB (bukan Rp 0).
2. Ganti timeline → angka & chart ikut berubah, tidak error.
3. Ganti cabang → revenue tersaring.
4. Aging outstanding menampilkan 26 invoices `unpaid` yang ada di DB.

Setuju lanjut implementasi?
