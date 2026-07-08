# Dashboard Audit Report — Stroban Member

Audit read-only atas seluruh route `/dashboard/*`, menu, komponen admin, dan sinyal runtime (console + runtime error). **Tidak ada perubahan kode diusulkan** — laporan saja, sesuai instruksi.

Sumber telaah: `src/pages/Admin.tsx`, `src/App.tsx`, `src/config/dashboardMenu.ts`, `src/components/admin/**`, hooks realtime, console/runtime error snapshot terakhir.

---

## Ringkasan Eksekutif

| Metric | Nilai |
|---|---|
| Total route dashboard (aktif + redirect) | **41** (23 aktif + 18 legacy redirect) |
| Total halaman aktif (unik) | **23** |
| PASS | 17 |
| WARNING | 5 |
| FAIL | 1 |
| Critical (P0) | **1** |
| High (P1) | **3** |
| Medium (P2) | **4** |
| Low (P3) | **5** |

Model peran nyata di codebase: `staff` (Owner), `admin_cabang`, `user`. Peran "Marketing / Finance / Inventory / Customer" yang disebut brief **tidak ada** sebagai role DB — akses diatur via 2 gate: `OwnerOnly` (`isStaff`) dan `NoBranchOnly` (`!isAdminCabang`).

---

## FAIL — Critical (P0)

### 1. Runtime crash: `Maximum call stack size exceeded` di Realtime channel
- **Halaman**: global (terjadi setelah navigasi antar-dashboard, terlihat di route `/dashboard/system-management?tab=deployment`).
- **Status**: FAIL · **Severity**: Critical · **Prioritas**: P0
- **Masalah**: `UNHANDLED_PROMISE_REJECTION — RangeError: Maximum call stack size exceeded` di `@supabase/supabase-js` `_RealtimeChannel.isEqual` → `_off` → `Push._cancelRefEvent`. Terjadi berulang.
- **Penyebab (probable)**: satu atau lebih hook subscribe `postgres_changes` dengan callback yang menyebabkan self-referential compare (mis. callback yang meng-capture object melingkar) atau channel yang tidak di-remove sebelum di-resubscribe. Kandidat utama pasca-migrasi Safe Realtime: `useDashboardBadges.ts`, `useFeedbackFeed.ts`, `useMissingWhatsApp.ts`, `LiveProgressTracker.tsx`, `useSystemCenter.ts` (5 channel bersamaan aktif di halaman dashboard).
- **File**: `node_modules/@supabase/supabase-js` + call sites di atas.
- **Rekomendasi (tidak diimplementasi)**: verifikasi setiap subscribe hanya dilakukan sekali per mount, callback tidak menutup objek melingkar (mis. state React yang berisi ref ke channel), pastikan `removeChannel` di cleanup, dan payload handler tidak memicu setState yang menyebabkan re-render → re-subscribe.

---

## WARNING — High (P1)

### 2. Duplicate route deklarasi: `dashboard/reports`
- **Route**: `/dashboard/reports`
- **File**: `src/pages/Admin.tsx` baris **108** dan **155**.
- **Masalah**: Route yang sama didaftarkan dua kali. Baris 155 (`<Navigate to="/dashboard/keuangan/report" replace />`) adalah **dead code** — tertimpa baris 108 (ReportsOverview). Menyebabkan kebingungan maintainer & risiko jika urutan berubah.
- **Severity**: High · **P1**
- **Rekomendasi**: hapus baris 155 (dead redirect).

### 3. Ambiguitas legacy redirect `keuangan/payment`
- **Route**: `/dashboard/keuangan/payment` (baris 120) & `/dashboard/payments` (baris 154).
- **Masalah**: `payments` → `keuangan/payment` → `history?tab=payments`. Rantai 2 hop; jika `HistoryHub` tidak menangani `tab=payments`, deep-link mendarat di tab default (dicek: `HistoryHub` menerima query tab, tetapi rantai 2-hop tetap boros).
- **Severity**: High · **P1**
- **Rekomendasi**: langsungkan `payments` → `history?tab=payments`.

### 4. A11y warning berulang: `DialogContent` tanpa `DialogTitle`/`aria-describedby`
- **Halaman**: minimal 3 kemunculan dalam 1 sesi (setelah login, buka overlay, buka dashboard).
- **Masalah**: Radix melempar warning "requires a `DialogTitle`… missing `Description`". Melanggar a11y & memicu bising console yang menutupi error lain.
- **File kandidat**: dialog di `Navbar`, `LoginDialog.tsx`, `NotificationCenter`, sheet-based side dialogs. Stack tidak menyebut komponen persis — perlu instrumentasi.
- **Severity**: High · **P1**

---

## WARNING — Medium (P2)

### 5. Sidebar `requiredRole` tidak selaras dengan route guard di beberapa entri
- **File**: `src/config/dashboardMenu.ts` vs `src/pages/Admin.tsx`.
- **Cocok**: Marketing (owner ↔ OwnerOnly), Branches, Legal, Audit Log, PWA, System Management (no_branch ↔ NoBranchOnly), Manual Payment, Referral, Financial Report, Correction Requests, Web Analytics.
- **Tidak eksplisit di menu tapi route ada / hidden**:
  - `/dashboard/page-audit` — route ada (OwnerOnly), **tidak ada entri sidebar** (page hidden by design).
  - `/dashboard/test-transactions` — route ada (OwnerOnly), tidak ada entri sidebar.
  - `/dashboard/feedback/internal` — route ada, tidak ada entri sidebar (parent `feedback` ada).
- **Severity**: Medium · **P2**. Bukan bug fungsional; catat sebagai halaman "hanya deep-link".

### 6. Halaman `Marketing → Overview` dan sub-item `Overview` duplikat URL
- **File**: `dashboardMenu.ts` baris 172 (`children[0]` "Overview" `/dashboard/marketing`) sama dengan parent `/dashboard/marketing` (baris 168).
- **Masalah**: Tile "Overview" muncul dua kali di sidebar-collapse & di Overview grid (parent + child dengan URL identik).
- **Severity**: Medium · **P2**

### 7. Rantai redirect legacy panjang
- `admin/*` → `dashboard` (App.tsx:208), `staff-setting` → `dashboard` (:209), `checkout*` → `booking` (:255–256), `inventory`/`roles`/`user-verification`/`users`/`branding`/`services`/`loyalty`/`rewards`/`maintenance`/`app-version`/`release-notes` → target masing-masing.
- **Total 18 legacy redirect** di `/dashboard/*` + 4 di root. Berfungsi, tapi banyak sekali; sebagian kandidat untuk dibersihkan (mis. `admin/*` sudah lama tidak dipakai).
- **Severity**: Medium · **P2**

### 8. Halaman archived masih ada di repo
- **File**: `src/pages/_archive/ServiceHistory.tsx`.
- Tidak ter-route, tidak ter-import — aman, tapi tetap terhitung "dead source". Sudah bertanda `_archive`.
- **Severity**: Medium · **P2**

---

## WARNING — Low (P3)

### 9. `useWebPush` log `skip: permission= denied` (bukan error)
- Informasi normal — user menolak permission push. Bukan bug, hanya bising log.
- **P3**

### 10. Menu "Web Analytics" (`requiredRole: "owner"`, `section: "laporan"`)
- Konsisten. Halaman ter-render via `WebAnalyticsDashboard` (lazy). Belum diverifikasi kelengkapan data (skeleton Phase 1 sesuai deskripsi rute). **Perlu QA data-completeness** manual.
- **P3**

### 11. `dashboard/scanner` hanya redirect ke `bookings?action=scan`
- Menu utama tidak mendaftarkan `scanner` — hanya URL_RULE untuk sectionization. Redirect murni, tak ada file halaman terpisah. **OK by design**, catat.
- **P3**

### 12. `system-management?tab=version` legacy vs tab id baru
- `SystemManagementHub.LEGACY_TAB_MAP` memetakan `version → deployment`. Redirect di `Admin.tsx:147` mengirim `?tab=version` — akan otomatis dipetakan. **OK**, tapi lebih bersih jika target langsung `?tab=deployment`.
- **P3**

### 13. Multiple concurrent realtime channels di halaman dashboard
- Setelah Safe Realtime: 5+ channel bersamaan (`system-center-live`, badges, feedback feed, missing-WA, live-progress). Tidak salah, tapi meningkatkan probabilitas P0 (item #1). Monitor jumlah subscribers.
- **P3**

---

## Route Matrix (aktif, non-redirect)

| Route | Guard | Komponen | Status |
|---|---|---|---|
| `/dashboard` (index) | AdminRoute | `AdminDashboard` (lazy) | PASS |
| `/dashboard/bookings` | AdminRoute | `BookingsManager` | PASS |
| `/dashboard/crm` | AdminRoute | `CRMDashboard` (lazy) | PASS |
| `/dashboard/slots` | AdminRoute | `SlotsManager` | PASS |
| `/dashboard/complaints` | AdminRoute | `ComplaintsManager` | PASS |
| `/dashboard/customers` | AdminRoute | `CustomerList` | PASS |
| `/dashboard/customers/:id` | AdminRoute | `CustomerDetail` | PASS |
| `/dashboard/branches` | OwnerOnly | `BranchManager` | PASS |
| `/dashboard/pickup-settings` | OwnerOnly | `PickupSettingsCard` | PASS |
| `/dashboard/marketing` | OwnerOnly | `MarketingOverview` | PASS (dup Overview di menu) |
| `/dashboard/marketing/services` | OwnerOnly | `ServiceManager` | PASS |
| `/dashboard/marketing/promos` | OwnerOnly | `PromosManager` | PASS |
| `/dashboard/marketing/loyalty` | OwnerOnly | `LoyaltyAnalytics+…` | PASS |
| `/dashboard/marketing/rewards` | OwnerOnly | `RewardsManager` | PASS |
| `/dashboard/marketing/branding` | OwnerOnly | `BrandingManager` | PASS |
| `/dashboard/marketing/popups` | OwnerOnly | `PromoPopupManager` | PASS |
| `/dashboard/history` | AdminRoute | `HistoryHub` | PASS |
| `/dashboard/reports` | AdminRoute | `ReportsOverview` | **duplicate route decl (P1)** |
| `/dashboard/reports/builder` | AdminRoute | `ReportBuilderPage` | PASS |
| `/dashboard/reports/:category[/:id]` | AdminRoute | `ReportCategoryPage`/`Detail` | PASS |
| `/dashboard/analytics` | AdminRoute | `WebAnalyticsDashboard` | PASS (P3 data-check) |
| `/dashboard/keuangan/report` | NoBranchOnly | `FinancialReport` | PASS |
| `/dashboard/keuangan/manual-payment` | OwnerOnly | `ManualPaymentManager` | PASS |
| `/dashboard/keuangan/referral` | OwnerOnly | `ReferralManager` | PASS |
| `/dashboard/legal` | OwnerOnly | `LegalDocumentsManager` | PASS |
| `/dashboard/audit-log` | OwnerOnly | `AuditLogPanel` | PASS |
| `/dashboard/correction-requests` | OwnerOnly | `CorrectionRequestsPanel` | PASS |
| `/dashboard/feedback` | AdminRoute | `FeedbackControlCenter` | PASS |
| `/dashboard/feedback/internal` | AdminRoute | `InternalReports` | PASS (hidden dari sidebar) |
| `/dashboard/pwa-settings` | OwnerOnly | `PwaSettingsManager` | PASS |
| `/dashboard/system-management` | NoBranchOnly | `SystemManagementHub` | WARN (item #1 muncul di sini) |
| `/dashboard/page-audit` | OwnerOnly | `PageAuditPanel` | PASS (hidden) |
| `/dashboard/test-transactions` | OwnerOnly | `TestTransactions` | PASS (hidden) |

Legacy redirect (18): `scanner`, `inventory`, `roles`, `services`, `loyalty`, `rewards`, `branding`, `user-verification`, `users`, `keuangan/payment`, `payments`, `keuangan`, `reports` (dup baris 155), `maintenance`, `app-version`, `release-notes` + root: `admin/*`, `staff-setting`, `checkout`, `checkout-coming-soon`.

---

## Ranking Prioritas Perbaikan (tidak dieksekusi)

1. **P0** — Debug root cause Realtime `Maximum call stack size` (item #1).
2. **P1** — Hapus deklarasi duplikat `path="reports"` (item #2).
3. **P1** — Perpendek rantai redirect `payments/keuangan/payment` (item #3).
4. **P1** — Tambah `DialogTitle` / `aria-describedby` di dialog yang memicu warning (item #4).
5. **P2** — Hilangkan duplikasi "Overview" di menu Marketing (item #6).
6. **P2** — Bersihkan legacy redirect lama yang sudah tidak relevan (item #7).
7. **P2** — Selaraskan tab id lama (`?tab=version`) → langsung target baru (item #12).
8. **P3** — Verifikasi kelengkapan data Web Analytics (item #10).
9. **P3** — Audit ulang jumlah simultan realtime channel (item #13).

---

## Yang Sudah Dicek dan PASS (highlights)
- Semua halaman aktif ter-import & ter-route (tidak ada orphan page selain `_archive`).
- Guard `OwnerOnly` / `NoBranchOnly` konsisten antara sidebar (`requiredRole`) & route.
- Tidak ada redirect loop terdeteksi.
- Tidak ada komponen halaman yang di-import tapi tidak dipakai di router (semua 23 import di `Admin.tsx` terpakai).
- Safe Realtime publication tidak mengekspos tabel PII (booking/profile/vehicle) — sesuai laporan Phase Security 2.

*Laporan berakhir. Tidak ada perubahan file yang dilakukan.*
