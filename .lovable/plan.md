## Audit Singkat (state saat ini)

| Dashboard | KPI/Card | Clickable? | Chart drill? |
|---|---|---|---|
| `AdminDashboard` (home) | ~8 (Booking, Revenue, Customer, …) | sebagian (3 onClick) | ❌ |
| `FinanceDashboard` | 6 KPI + AreaChart | ❌ (hampir nol) | ❌ |
| `FinancialReport` (9 section) | 6 KPI revenue + breakdown + promo/loyalty/referral | ❌ | ❌ |
| `CRMDashboard`/`CRMAnalytics` | KPI customer | sebagian (9) | ❌ |
| `LoyaltyAnalytics` | KPI point | ❌ | ❌ |
| `MarketingOverview` | KPI promo | ❌ | ❌ |
| `WebAnalyticsDashboard` | KPI traffic | ❌ | ❌ |
| `HistoryHub` (tab) | sudah filter-friendly | ✅ | n/a |

**Kesimpulan:** mayoritas angka adalah display-only. Filter tiap halaman juga **isolated** (state lokal) — tidak bisa "klik bar → semua halaman ikut terfilter".

## Peta Hubungan Antar Modul (target)

```text
                    ┌──────────────────────┐
                    │  GLOBAL FILTER (URL) │
                    │ date · branch · cust │
                    │ vehicle · promo · …  │
                    └──────────┬───────────┘
                               │ (semua page baca dari sini)
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
  AdminDashboard         FinanceDashboard         CRMDashboard
  Booking KPI ─┐         Revenue KPI ─┐           Customer KPI ─┐
               ▼                       ▼                         ▼
        HistoryHub?tab=bookings  HistoryHub?tab=payments    Customers?...
               │                       │                         │
               ▼                       ▼                         ▼
        Booking Detail          Invoice /invoice/:id       Customer Detail
               │                       │                         │
               └─────────►  Customer ◄─┴──────────► Vehicle ◄────┘
                                    │
                  Promo/Loyalty/Referral cards
                  → HistoryHub?tab=promo|loyalty|referral
```

Setiap panah = navigasi yang membawa **konteks filter via URL**.

## Strategi Implementasi (5 phase, semua tanpa mengubah business logic)

### Phase 1 — Fondasi Filter Global (URL-driven)

1. **`src/lib/dashFilters.ts`** — shared schema + serialize/deserialize ke `URLSearchParams`:
   `date_preset, date_from, date_to, branch, customer, vehicle, promo, payment_status, booking_status, loyalty, referral, payment_method`.
2. **`useDashFilters()` hook** — baca/tulis URL params, sinkron antar tab via `useSearchParams`, debounce 300ms.
3. **`<DashFilterBar />`** komponen reusable (chip aktif + tombol reset). Di-mount di AdminLayout (sticky di atas content) ATAU per-page toggle — tergantung Anda (lihat pertanyaan).
4. **`buildHref(target, overrides)`** helper — bikin URL `/dashboard/x?...` dengan filter aktif diteruskan.

### Phase 2 — Primitives Drill-down

1. **`<DrillCard href onClick title value subtitle icon trend />`** — gantikan KPI card statis. Cursor pointer, hover ring, keyboard accessible. Jika `href` kosong → tetap render non-clickable + tooltip "Detail belum tersedia".
2. **`<DrillBadge href status />`** — status badge clickable yang menambahkan filter `status=…` ke URL target.
3. **`<DrillChart onSliceClick(point) >`** — wrapper Recharts (Bar/Pie/Line) yang menyediakan `onClick` per-element → memanggil `setFilter` + navigate.
4. **`<Breadcrumbs />`** — dinamis dari `location.pathname` + label map; tampil di bawah header AdminLayout.

### Phase 3 — Wire-up dashboard utama

Urutan eksekusi (per dashboard = 1 commit kecil, mudah di-review):

1. **AdminDashboard (home)** — Booking Hari Ini → `/dashboard/history?tab=bookings&date_preset=today`; Revenue → `?tab=payments&payment_status=success`; Customer → `/dashboard/customers`; dst.
2. **FinanceDashboard** — semua 6 KPI → `HistoryHub?tab=payments` dengan filter terkait; chart area klik bar → set `date_from/date_to` per hari.
3. **FinancialReport** — 6 KPI revenue + Payment Breakdown table baris klik → HistoryHub; Promo Analytics row → `?tab=promo&promo=<id>`; Loyalty → `?tab=loyalty&loyalty=<type>`; Referral → `?tab=referral&customer=<id>`; Cost stacked bar klik segment → filter cost type.
4. **CRMDashboard / Analytics** — customer KPI → `/dashboard/customers?...`; per-row klik → `CustomerDetail` (yang sudah ada).
5. **LoyaltyAnalytics** — Point KPI → `HistoryHub?tab=loyalty`.
6. **MarketingOverview** — Promo KPI → `HistoryHub?tab=promo&promo=<id>`.

### Phase 4 — Cross-module entry points

- Di **CustomerDetail**: tambah quick-links "Lihat Booking History" → `HistoryHub?tab=bookings&customer=<id>`, "Payment History" → `?tab=payments&customer=<id>`, "Vehicle" → `/dashboard/vehicles?customer=<id>`.
- Di **Invoice page**: tambah link ke `CustomerDetail`, ke `HistoryHub?tab=payments&customer=<id>`.
- Di **BookingsManager** row: tambah icon → buka invoice/customer/vehicle.

### Phase 5 — Mobile UX & breadcrumb polish

- Detail di mobile dibuka pakai **bottom-sheet** (Sheet) bila konteks "detail ringkas" (mis. quick payment proof preview). Halaman penuh tetap pakai route normal.
- Breadcrumb collapse → "← Back" + judul current page di mobile.
- Filter bar di mobile → tombol "Filter (N)" buka Sheet.

### Phase 6 (opsional, terakhir) — Performance & cache

- React Query `staleTime: 30s` per KPI query → tidak refetch saat user pindah tab/filter sama.
- Lazy-load chart heavy (Recharts) via `React.lazy` di halaman yang jarang dibuka.

## Aturan Konsistensi

| Aturan | Implementasi |
|---|---|
| Tidak boleh KPI dummy clickable | `DrillCard` tanpa `href` render disabled state + tooltip |
| Filter sinkron antar page | semua dashboard pakai `useDashFilters()`, sumber tunggal = URL |
| Tidak mengubah business logic | Phase 1-6 hanya UI/URL/navigasi, query SQL tidak diubah |
| Role-based scoping tetap | `useScopedBranches()` + RLS yang sudah ada, branch lock tetap hormati |
| Bookmarkable | semua state masuk URL (kecuali pagination opsional) |

## Estimasi Cakupan

- Phase 1 + 2: 4 file baru (~400 LoC), zero perubahan dashboard.
- Phase 3: 6 dashboard di-edit, masing-masing ~30-80 baris (ganti `<Card>` → `<DrillCard href={...}>`).
- Phase 4: 4 file (CustomerDetail, Invoice, BookingsManager, VehicleDetail) → ~20-30 LoC tambahan.
- Phase 5-6: opsional, bisa ditunda.

## Pertanyaan Sebelum Mulai

1. **Filter bar global** — di-mount sticky di `AdminLayout` (selalu terlihat di semua page) atau per-page sesuai kebutuhan? Sticky lebih kuat, tapi makan ruang di mobile.
2. **Sumber kebenaran filter** — URL saja (rekomendasi: bookmark-friendly), atau URL + localStorage (lanjut dari sesi sebelumnya)?
3. **Eksekusi bertahap atau sekaligus** — saya mulai Phase 1+2+wire-up AdminDashboard + FinanceDashboard dulu (paling sering dipakai), lalu lanjut yang lain bertahap. Atau Anda mau saya kerjakan semua dashboard sekaligus?
4. **Filter "Customer"** — autocomplete dari `profiles` (lebih bagus tapi perlu komponen baru), atau cukup text search seperti sekarang?
