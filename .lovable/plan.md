## Audit Data Yang Tersedia

Sebelum kode apa pun ditulis, berikut hasil audit field di DB vs requirement:

| Section | Source data | Status |
|---|---|---|
| 1. Revenue Overview | `bookings(service_price, payment_status, created_at, branch)` + `tire_orders.total_amount` | ✅ Lengkap |
| 2. Payment Breakdown | `bookings.payment_status` (paid/unpaid/pay_later), `discount_source`, `cashback_used`, `service_price=0` | ⚠️ Sebagian (lihat gap di bawah) |
| 3. Promo Analytics | `promos`, `promo_claims`, `bookings.promo_claim_id` + `discount_code` + `discount_amount` | ✅ Lengkap |
| 4. Loyalty Analytics | `loyalty_transactions` (earn/redeem), `reward_redemptions` join `rewards.discount_value` | ✅ Lengkap |
| 5. Referral Analytics | `referral_commissions` (per booking), `profiles.full_name` untuk referrer | ✅ Lengkap |
| 6. Free Service & Claim | `bookings.service_price = 0` → free service. **Warranty/Claim: tidak ada flag** | ⚠️ Gap → butuh approval DB |
| 7. Discount Cost Report | `bookings.discount_amount` per `discount_source`, `cashback_used`, `referral_commissions.amount`, `reward_redemptions` | ⚠️ "Manual Discount" perlu flag |
| 8. Net Revenue | Computed dari Section 1 − Section 7 | ✅ |
| 9. Top Insight | Computed | ✅ |

### Gap & Permintaan Approval (1 migration kecil, opsional)

Field yang belum ada, dibutuhkan untuk Section 2/6/7 (Warranty/Claim & Manual Adjustment):

```sql
ALTER TABLE public.bookings
  ADD COLUMN transaction_kind text NOT NULL DEFAULT 'regular'
  CHECK (transaction_kind IN ('regular','free','warranty','claim','manual_adjustment'));
```

- `free` = booking tanpa biaya (auto-set lewat trigger jika `service_price=0`).
- `warranty` / `claim` = pekerjaan garansi tanpa revenue.
- `manual_adjustment` = koreksi manual oleh staff.

Tanpa migration ini, Section 6 hanya menampilkan **Free Service** (dari `service_price=0`), dan Warranty/Claim/Manual Adjustment akan ditampilkan sebagai placeholder "0 — belum diaktifkan". **Saya tunggu jawaban Anda di pertanyaan terpisah** apakah migration ini dijalankan sekarang, di kemudian hari, atau di-skip.

## Perubahan File

### 1. `src/components/admin/FinancialReport.tsx` — REWRITE (existing fitur tidak dihapus, disempurnakan)

Layout (top → bottom):

```text
[ Filter Bar ]
  Timeline preset (Hari/Minggu/Bulan/Custom) │ Cabang │ Customer (search) │ Promo (dropdown) │ Status Booking
  [Export Excel] [Export PDF]

[ SECTION 1 — Revenue Overview ]  6 KPI
  Total Revenue │ Total Booking │ AOV │ Revenue Hari Ini │ Revenue Minggu Ini │ Revenue Bulan Ini

[ SECTION 2 — Payment Breakdown ]  Table + 100% stacked bar
  Full Payment │ Partial │ Promo Applied │ Loyalty Redemption │ Referral Reward │ Free │ Warranty │ Manual
  → jumlah tx, total revenue, % kontribusi

[ SECTION 3 — Promo Analytics ]
  Header KPI (4): Promo Digunakan, Nilai Potongan, Booking Pakai Promo, Revenue Dari Promo
  Tabel per promo (sortable): Nama, Digunakan, Total Potongan, Revenue

[ SECTION 4 — Loyalty Analytics ]
  KPI (4): Point Diberikan, Point Ditukar, Nilai Penukaran (Rp), Customer Pakai Loyalty
  Toggle periode Hari/Minggu/Bulan (sub-filter di card)

[ SECTION 5 — Referral Analytics ]
  KPI (3): Customer Direferensikan, Booking Dari Referral, Revenue Dari Referral
  Tabel per referrer: Nama, Jumlah Referral, Booking Berhasil, Revenue

[ SECTION 6 — Free Service & Claim ]
  KPI 4 kotak (Free count/value, Warranty count/value, Claim count/value, Total Cost Ditanggung)
  Note placeholder kalau migration belum dijalankan

[ SECTION 7 — Discount Cost Report ]
  Stacked bar (Promo / Loyalty / Referral / Manual)
  Sub-total tiap kategori + Total Cost To Company

[ SECTION 8 — NET REVENUE ]  highlighted card
  Gross Revenue
  (−) Promo Cost
  (−) Loyalty Cost
  (−) Referral Cost
  (−) Free Service Cost
  ────────────────
  = Net Revenue  (font besar, hijau)
  Plus mini line chart: trend Net Revenue bulanan 6 bulan terakhir

[ SECTION 9 — TOP INSIGHT ]
  Card berisi 5 bullet otomatis (regenerate per filter):
   - Promo X menghasilkan revenue tertinggi
   - Cabang Y dengan penggunaan promo tertinggi
   - Referral menghasilkan N% booking
   - Loyalty redemption naik/turun M% vs periode sebelumnya
   - Free service ditangani sebesar Rp ...

[ Trend Bulanan ]  area chart 6 bulan: Gross vs Net
```

### 2. Filter & data fetch

- Reuse `getDateRange()` + `TIMELINE_PRESETS` dari `src/utils/timelineFilter.ts`.
- Cabang: `useBranches()`.
- Customer: search input, query `bookings` dengan `ilike(customer_name)` atau `customer_phone`.
- Promo: dropdown dari `promos` aktif + opsi "Semua".
- Status Booking: dropdown `pending/confirmed/in_progress/completed/cancelled`.
- Semua filter diapply server-side via Supabase chained queries.

Query paralel (Promise.all):
- `bookings` (full kolom keuangan)
- `tire_orders` (paid totals)
- `payments`
- `promo_claims` + `promos` (untuk per-promo breakdown)
- `loyalty_transactions` + `reward_redemptions` join `rewards`
- `referral_commissions` + `profiles` (untuk nama referrer)
- Periode sebelumnya untuk delta % (Section 9)

### 3. Export

- Excel via `xlsx` (sudah dipakai Reports Hub). Multi-sheet: Overview, Payment Breakdown, Promo, Loyalty, Referral, Free/Claim, Discount Cost, Net Revenue.
- PDF via `jspdf` + `jspdf-autotable` + `useBranding()` untuk header (sama pola Reports Hub).
- Helper diletakkan di `src/components/admin/financial/exporters/` (file baru), bukan rewrite Reports Hub.

### 4. Komponen helper baru (kecil, satu folder)

```
src/components/admin/financial/
  FinancialFilters.tsx         (filter bar)
  KpiStrip.tsx                 (KPI cards reusable)
  SectionRevenueOverview.tsx
  SectionPaymentBreakdown.tsx
  SectionPromoAnalytics.tsx
  SectionLoyaltyAnalytics.tsx
  SectionReferralAnalytics.tsx
  SectionFreeAndClaim.tsx
  SectionDiscountCost.tsx
  SectionNetRevenue.tsx
  SectionTopInsight.tsx
  exporters/exportFinancialExcel.ts
  exporters/exportFinancialPdf.ts
  useFinancialData.ts          (data hook, single source of truth)
```

`FinancialReport.tsx` jadi container tipis yang mengompos section di atas.

### 5. Klasifikasi Payment Breakdown (mapping deterministik tanpa schema baru)

```text
Full Payment        → payment_status='paid' AND discount_amount=0 AND cashback_used=0 AND promo_claim_id IS NULL AND service_price>0
Partial Payment     → payment_status='pay_later'
Promo Applied       → discount_source='promo' OR promo_claim_id IS NOT NULL
Loyalty Redemption  → discount_source IN ('reward','loyalty') OR ada reward_redemptions.used_at match booking date+user
Referral Reward     → cashback_used > 0 AND discount_source='cashback' (referral cashback) — atau cocokkan dengan referral_commissions.booking_id
Free Service        → service_price = 0 OR transaction_kind='free'
Warranty / Claim    → transaction_kind IN ('warranty','claim')   [butuh migration]
Manual Adjustment   → transaction_kind='manual_adjustment'        [butuh migration]
```

Saat migration belum jalan, kategori 7 & 8 tampil "0 transaksi" + label "(field belum diaktifkan)".

## Yang Tidak Diubah

- KPI & chart existing tidak dihapus — disusun ulang menjadi Section 1 & 2.
- Tidak menyentuh `FinanceDashboard.tsx` (overview lain), Reports Hub, atau modul lain.
- Tidak ada perubahan RLS/edge function.

## Validasi

1. Buka `/dashboard/keuangan/report` → 9 section muncul, filter default Bulan Ini.
2. Ubah cabang/promo/customer → semua KPI & tabel re-fetch.
3. Export Excel → multi-sheet, angka cocok dengan Section.
4. Export PDF → satu dokumen branded.
5. Mobile (390px) → KPI 2-kolom, tabel scroll horizontal.
6. Net Revenue card menampilkan rumus terbuka (Gross − cost-cost = Net).

## Pertanyaan Yang Butuh Jawaban Anda

1. **Migration `transaction_kind`** (untuk Warranty/Claim/Manual Adjustment) — jalankan sekarang, atau tampilkan placeholder dulu?
2. **Filter Customer** — cukup search text (nama/HP), atau perlu dropdown autocomplete dari `profiles`?
3. **Toggle periode di Loyalty Section** (Hari/Minggu/Bulan) — apakah ini override filter global, atau hanya sub-grouping dalam range filter global?
