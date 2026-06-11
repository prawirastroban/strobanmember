# Report Center Enhancement Plan

> Prinsip: **enhancement, bukan rewrite**. Semua laporan, URL, dan permission existing tetap berjalan apa adanya.

---

## A. Audit Modul Existing (yang DIPERTAHANKAN)

**Struktur saat ini** (`src/components/admin/reports/`):
- `ReportRegistry.ts` — 9 kategori, ±25 laporan terdaftar
- `ReportsOverview.tsx` — grid kategori
- `ReportCategoryPage.tsx` — daftar laporan per kategori
- `ReportDetailPage.tsx` — filter + KPI + tabel + export
- `ReportFilters.tsx`, `ReportKPIStrip.tsx`, `ReportTable.tsx`
- `exporters/exportToExcel.ts`, `exporters/exportToPdf.ts`
- `types.ts`

**Kategori existing:** sales, finance (sensitive), payments (sensitive), customers, vehicles, loyalty, promos, operations, response.

**Route existing (TIDAK diubah):**
- `/dashboard/reports`
- `/dashboard/reports/:category`
- `/dashboard/reports/:category/:id`

**Permission existing (TIDAK diubah):** `sensitive` category disembunyikan kalau `!canManageFinancial`. Branch lock via `useScopedBranches`.

**Tidak ada perubahan destruktif** — semua `ReportDefinition` lama tetap, kontrak `load()` tetap, exporter tetap.

---

## B. Gap vs Permintaan & Pemetaan Risiko

| Permintaan user | Status existing | Aksi |
|---|---|---|
| Booking / Customer / Financial / Promo / Loyalty / Referral Reports | sebagian ada | **Tambah** report definitions, tidak menghapus |
| Inventory & Purchasing Reports | belum ada | **Tambah kategori baru** |
| Custom Report Builder | belum ada | **Tambah modul baru**, opt-in |
| Report Template (save/edit/dup/fav) | belum ada | **Tabel baru** `report_templates` |
| Drill-down summary→detail→trx | sebagian (link manual) | **Tambah** `drillTo` opsional per kolom |
| Export Excel/PDF | ada | **Tambah** CSV + Print View |
| Calculated Field (whitelist) | belum ada | **Tambah** evaluator aman |
| Role permission | sudah ada (canManageFinancial, branch scope) | **Pertahankan**, ekstensi untuk Builder |

Tidak ada perubahan yang berisiko mengubah hasil laporan lama.

---

## C. Phase 1 — Tambah Laporan ke Kategori Existing

Tanpa menghapus apapun, tambahkan ke `ReportRegistry.ts`:

- **Booking**: booking bulanan (sales-monthly), booking per cabang (sudah ada), booking per layanan (sudah ada). Tambah: `sales-monthly`.
- **Customer**: tambah `customers-active` (punya booking di periode), `customers-by-vehicle` (group by brand kendaraan).
- **Financial**: tambah `finance-promo-cost`, `finance-loyalty-cost`, `finance-referral-cost` (dari `promo_claims`, `loyalty_transactions`, `referral_commissions`).
- **Promo**: tambah `promo-usage`, `promo-discount-total`, `promo-top` (dari `promo_claims` + `promos`).
- **Loyalty**: `loyalty-points-earned`, `loyalty-points-redeemed` (dari `loyalty_transactions`).
- **Referral**: `referral-success`, `referral-revenue` (dari `referral_commissions`).

**Kategori baru** (non-sensitive untuk inventory/purchasing, gating per role):
- `inventory` — Stok (`tires`), Fast Moving & Slow Moving (dari `tire_orders` 30 hari).
- `purchasing` — *placeholder*: jika tabel pembelian/supplier belum ada, tampilkan empty-state "belum ada data" agar tidak break. (Lihat poin "Hal yang perlu approval".)

## D. Phase 2 — Custom Report Builder

Halaman baru: `/dashboard/reports/builder` (link dari Overview, opt-in card "Custom Report Builder").

- **DataSources** (whitelist): bookings, profiles, vehicles, payments, promo_claims, loyalty_transactions, referral_commissions, branches, tires, tire_orders.
- **Pivot config**: rows[], columns[], values[] (count/sum/avg + field), filters[] (date/branch/status/customer/promo/supplier/vehicle).
- **Eksekusi**: client-side aggregation memakai data hasil `SELECT` Supabase yang dibatasi field whitelist + RLS user. Tidak ada SQL bebas.
- **Output**: tabel pivot + KPI ringkas + reuse `exporters/*`.

Permission: hanya `admin`, `staff`, `admin_cabang` (sesuai dashboard akses). Customer tidak melihat menu.

## E. Phase 3 — Report Template

**Migrasi DB baru** (additive only):
- Table `report_templates` (id, user_id, name, kind: 'standard'|'builder', config jsonb, is_favorite, created_at, updated_at).
- RLS: pemilik bisa CRUD; staff/admin owner bisa lihat template milik tim cabangnya (opsional).
- GRANT + policies sesuai pedoman.

UI: dropdown "Template" di Builder & Detail (Save / Save As / Edit / Duplicate / Delete / ⭐Favorite). Section "Template Saya" di Overview.

## F. Phase 4 — Drill-Down

Tambah opsional pada `ReportColumn`:
```ts
drillTo?: (row) => string  // returns route
```
- Revenue per cabang → `/dashboard/reports/finance/finance-revenue-daily?branch=...`
- Invoice no → `/invoice/:bookingId`
- Customer → `/dashboard/customers/:id`

`ReportTable` mendeteksi `drillTo` dan jadikan sel sebagai link. Tidak mengubah perilaku kolom existing yang tidak set `drillTo`.

## G. Phase 5 — Export Center

Di `ReportDetailPage` & Builder, tambah:
- **CSV** (`exporters/exportToCsv.ts` baru, pakai header `ReportColumn`).
- **Print View** (`/dashboard/reports/print/:id?...` — route baru, layout polos A4, auto `window.print()`).
- Excel & PDF existing tetap.

## H. Phase 6 — Calculated Field (whitelist)

Di Builder:
- UI: pilih nama field hasil + ekspresi dari token whitelist (`SUM(revenue)`, `COUNT(*)`, `AVG(ticket)`, `+ - * /`, kurung).
- Parser: AST kecil — hanya identifier dari measures yang dipilih, angka literal, dan 4 operator + parentheses. Tidak ada `eval`. Maks 1 ekspresi per field, panjang ≤120 char.
- Built-in helper: `Margin = Revenue - Cost`, `Discount % = Discount / Revenue`.

## I. Role Permission (TIDAK diubah, hanya diperluas)

| Role | Akses |
|---|---|
| customer | tidak melihat menu Reports (sudah begitu) |
| admin_cabang | laporan + builder, **branch terkunci** via `useScopedBranches` (sudah) |
| admin (CS) | semua kecuali tetap mengikuti `canManageFinancial` |
| staff (Owner) / super admin | semua, termasuk template global |

Builder & Template baru mengikuti aturan yang sama.

## J. UI Requirements

- **Sticky filter bar** + **sticky table header** di `ReportDetailPage` & Builder.
- **Search Report** di Overview (filter nama laporan & kategori).
- Konsisten: card glass, hover red glow (sudah).
- Mobile: filter jadi sheet/drawer collapse.

---

## K. File Plan (tambah, tidak menghapus)

**Tambah:**
- `src/components/admin/reports/builder/ReportBuilderPage.tsx`
- `src/components/admin/reports/builder/{DataSourcePicker,PivotConfig,FilterConfig,CalculatedFieldEditor,ResultPivot}.tsx`
- `src/components/admin/reports/builder/dataSources.ts` (whitelist fields)
- `src/components/admin/reports/builder/calcParser.ts`
- `src/components/admin/reports/templates/{TemplatesPanel,TemplateSaveDialog}.tsx`
- `src/components/admin/reports/exporters/exportToCsv.ts`
- `src/components/admin/reports/PrintView.tsx` + route
- `src/components/admin/reports/ReportSearch.tsx`
- `src/hooks/useReportTemplates.ts`
- Migration: `report_templates` table + RLS + GRANT.

**Edit minimal:**
- `ReportRegistry.ts` — append definisi baru + 2 kategori baru.
- `types.ts` — tambah `drillTo?` & format `csv` opsional.
- `ReportTable.tsx` — render link bila `drillTo` ada + sticky header class.
- `ReportDetailPage.tsx` — tombol CSV + Print + Save Template + sticky filter.
- `ReportsOverview.tsx` — card "Custom Report Builder" + "Template Saya" + search.
- `src/pages/Admin.tsx` — route `builder` & `print`.
- `src/config/dashboardMenu.ts` — pastikan menu tetap satu entry "Daftar Laporan".

---

## L. Backward Compatibility Checklist (verifikasi setelah implementasi)

- [ ] Semua URL `/dashboard/reports/:category/:id` lama buka laporan yang sama.
- [ ] Kontrak `ReportDefinition.load()` & `columns` tidak berubah.
- [ ] Export Excel & PDF existing menghasilkan file yang sama.
- [ ] Filter `sensitive`/`canManageFinancial` tidak berubah.
- [ ] Branch lock `admin_cabang` tetap aktif di semua tampilan baru.

---

## M. Hal yang Perlu Approval Sebelum Build

1. **Purchasing module**: tidak ada tabel `purchases`/`suppliers` di schema. Opsi:
   - (a) skip kategori purchasing untuk sekarang; atau
   - (b) saya tambahkan migration tabel baru `suppliers`, `purchase_orders`, `purchase_order_items` (tambah scope besar).
2. **Template scope**: template = pribadi per user, atau bisa di-share dalam cabang/global oleh Owner?
3. **Builder ekspor data mentah**: apakah perlu batasi jumlah baris (mis. 10.000) untuk hindari beban?

Jawab tiga poin di atas → saya langsung lanjut ke implementasi Phase 1–6.
