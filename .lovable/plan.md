# Audit & Refactor Plan — Konsolidasi Tanpa Fitur Baru

Tujuan: rapikan aplikasi existing. Tidak ada DB, endpoint, business logic, atau alur pengguna yang berubah. Semua fungsi tetap dapat diakses, hanya lebih ringkas.

## 1. Temuan Duplikasi Utama

### 1a. Tiga "System/Maintenance" hub yang tumpang-tindih
Saat ini ada tiga komponen + dua route sekaligus:

| Route | Komponen | Isi |
|---|---|---|
| `/dashboard/system-management` | `SystemManagementCenter` (system-center/) | Dashboard cards: status, quick actions, activity |
| `/dashboard/system-management` (alt) | `SystemManagementHub` (system/) | Tabs: Dashboard, Versi, Maintenance, Release Notes, History, Audit, Sessions, Cache, Update Center — TIDAK terpasang di router |
| `/dashboard/maintenance` | `MaintenanceCenterHub` | Tabs: Version, Release Notes, Audit, Play Store, Force Refresh, Notif Audit, PWA Audit |

Menu sidebar juga menampilkan **"System Management"** dan **"Maintenance"** sebagai dua entry berbeda padahal keduanya adalah pusat kontrol sistem.

### 1b. Route/menu duplikat lain
- `/dashboard/app-version` & `/dashboard/release-notes` sudah redirect ke maintenance → menu-nya juga sudah tidak ada di sidebar (ok, cukup verifikasi).
- `feedback` (`FeedbackControlCenter`) & `feedback/internal` (`InternalReports`) — dua tempat untuk bug/masukan internal. Cek apakah `InternalReports` sudah tidak tereferensi.
- `PageAuditPanel` di `/dashboard/page-audit` tidak ada entry sidebar & tidak dipanggil dari mana pun → kandidat hapus atau dijadikan tab dalam System Center.
- `TestTransactions` di `/dashboard/test-transactions` tanpa entry sidebar → verifikasi masih dipakai; kalau ya, biarkan (tidak dihapus).

### 1c. Komponen UI duplikat
- `UpdateDialog` + `UpdatePopup` (root `src/components/UpdatePopup.tsx` vs `src/components/update/UpdateDialog.tsx`) — cek yang tereferensi, hapus yang tidak.
- `VersionGate` vs `VersionEnforcementGate` — dua wrapper enforcement versi. Konsolidasi ke `VersionEnforcementGate` (yang aktif di App.tsx).
- Beberapa toast host: `use-toast`, `sonner` — biarkan karena keduanya dipakai (bukan duplikasi bug).

## 2. Aksi Konsolidasi

### 2a. Satu pusat: **System Management Center**
- Kanonikkan `/dashboard/system-management` sebagai satu-satunya route.
- Refactor `SystemManagementCenter` (dashboard cards) menjadi **tab "Dashboard"** di dalam `SystemManagementHub`.
- Pindahkan seluruh isi `MaintenanceCenterHub` (Play Store, Force Refresh, Notif Audit, PWA Audit) menjadi tab tambahan di `SystemManagementHub`. Tidak menyalin logic — cukup import panel yang sama (`PlayStoreReadinessChecklist`, `ForceRefreshCenter`, `NotificationAuditPanel`, `PWAAuditPanel`).
- Hapus file `MaintenanceCenterHub.tsx` dan `system-center/SystemManagementCenter.tsx` setelah kontennya diimpor dari `SystemManagementHub`.
- Route `/dashboard/maintenance` → `<Navigate to="/dashboard/system-management" replace />` (menjaga bookmark & QuickAction lama).
- Query param `?tab=` dipertahankan agar Quick Actions existing (`?tab=version`, dll.) tetap berfungsi.

### 2b. Sidebar
- Hapus entry menu **Maintenance** dari `dashboardMenu` di `src/config/dashboardMenu.ts`.
- Rename entry **System Management** → tetap satu tile pusat kontrol.
- Bersihkan `URL_RULES` untuk `/dashboard/maintenance` dan `/dashboard/app-version` yang sudah tidak dibutuhkan setelah menu-nya hilang (tetap sisakan untuk redirect classification bila perlu).

### 2c. Route cleanup di `Admin.tsx`
- Konsolidasi legacy redirect: `/app-version`, `/release-notes`, `/maintenance` → semua ke `/system-management`.
- Verifikasi setiap route punya guard: `OwnerOnly` atau `NoBranchOnly`. Setiap route baru yang menggantikan `maintenance` (Owner-only) tetap dijaga sebagai `OwnerOnly` untuk tab-tab sensitif — tab-level guard di `SystemManagementHub` (Play Store, Force Refresh, Notif Audit) akan cek `isStaff` dari `useUserRole`.

### 2d. Permission audit
Sisir seluruh entry di `Admin.tsx`:
- `bookings`, `crm`, `slots`, `customers`, `complaints`, `history`, `analytics`, `reports*`, `feedback` saat ini di-render tanpa guard eksplisit — tapi seluruh `/dashboard/*` sudah di-wrap oleh `AdminRoute` (Owner/Admin/AdminCabang) di parent. Tambahkan komentar penegas. Tidak ada perubahan behavior.
- Pastikan tidak ada halaman non-dashboard sensitif yang tidak diproteksi (`AuthCallback`, `OAuthBrokerFallback`, `PublicBookingTracker`, `Feedback`, `PublicReviewForm`, `ClaimAccount` memang public → biarkan).

### 2e. Dead code sweep (aman, hanya bila 0 referensi)
Kandidat hapus setelah verifikasi grep menunjukkan 0 impor aktif:
- `src/components/UpdatePopup.tsx` (bila `UpdateDialog` sudah menggantikan sepenuhnya)
- `src/components/VersionGate.tsx` (bila `VersionEnforcementGate` sudah menggantikan)
- `src/components/admin/system/UpdateCenterPreview.tsx` — cek apakah masih dibutuhkan sebagai tab
- `src/components/admin/PageAuditPanel.tsx` + route `/dashboard/page-audit` — bila tidak dibuka darimana-mana
- `src/components/admin/internal/InternalReports.tsx` — bila tidak ada link menuju `feedback/internal`
- Import icon Lucide yang tidak dipakai di `dashboardMenu.ts` (`Rocket`, `Wrench`, `LayoutDashboard` bila entry-nya dihapus)

Untuk setiap kandidat: **cek dulu dengan `rg`**, hapus hanya bila 0 rujukan. Kalau ragu → biarkan.

### 2f. Service/hook/context/lib scan
- Setiap file di `src/services/`, `src/hooks/`, `src/contexts/`, `src/lib/` diverifikasi dengan `rg` — hapus hanya bila 0 import.
- Fokus utama: `updateChecker.ts` vs `versionCheck.ts` (dua-duanya export `checkForUpdates`-like); pastikan hanya satu yang direferensikan.
- Tidak menyentuh endpoint Supabase (`supabase/functions/*`) — sesuai batasan user.

## 3. Yang TIDAK Diubah

- Database, migrasi, RLS, policies.
- Edge Functions (`supabase/functions/*`).
- Business logic: booking flow, checkout, loyalty, referral, notification dispatch, OAuth, version detection.
- Alur user-facing: home, katalog, booking, profile, popup, cookie, overlay queue.
- Halaman publik dan public routes.

## 4. Detail Teknis

```text
Struktur akhir "Pusat Kontrol Sistem":

/dashboard/system-management   ← satu-satunya route
  └── SystemManagementHub (tabs)
       ├── Dashboard          (ex-SystemManagementCenter cards)
       ├── Versi Aplikasi     (AppVersionManager)
       ├── Maintenance Mode   (MaintenanceModePanel)
       ├── Release Notes      (ReleaseNotesManager)
       ├── Deployment History (DeploymentHistoryPanel)
       ├── System Audit       (SystemAuditPanel)
       ├── Play Store         (PlayStoreReadinessChecklist)   ← pindah dari MaintenanceCenterHub
       ├── Force Refresh      (ForceRefreshCenter)            ← pindah
       ├── Notification Audit (NotificationAuditPanel)        ← pindah
       ├── PWA Audit          (PWAAuditPanel)                 ← pindah
       ├── User Sessions      (UserSessionsPanel)
       ├── Cache              (CacheManagementPanel)
       └── Update Center      (UpdateCenterPreview) — dipertahankan bila masih relevan

Legacy redirects (Admin.tsx):
  /dashboard/maintenance       → /dashboard/system-management
  /dashboard/app-version       → /dashboard/system-management?tab=version
  /dashboard/release-notes     → /dashboard/system-management?tab=release-notes
```

Files yang akan disentuh (edit / delete only, no new pages):
- `src/config/dashboardMenu.ts` — hapus entry Maintenance, bersihkan icon import.
- `src/components/admin/system/SystemManagementHub.tsx` — tambah tabs dari Maintenance & merge dashboard.
- `src/components/admin/system/MaintenanceCenterHub.tsx` — hapus.
- `src/components/admin/system-center/SystemManagementCenter.tsx` — konten dipindah, folder dihapus.
- `src/pages/Admin.tsx` — update route + redirect.
- Kandidat delete (bila 0 ref): `UpdatePopup.tsx`, `VersionGate.tsx`, `PageAuditPanel.tsx` + route, `InternalReports.tsx` + route.

## 5. Verifikasi Pasca-Refactor

1. `tsgo` typecheck bersih.
2. Navigasi manual: setiap Quick Action lama dari komponen lain yang mengarah ke `/dashboard/maintenance?tab=...` masih membuka tab yang benar via redirect.
3. Sidebar hanya menampilkan **satu** entry "System Management".
4. Semua panel existing masih terbuka dan berfungsi (form save, tabel load).
5. Guard route: mencoba akses sebagai `admin_cabang` diarahkan kembali ke `/dashboard`.

Setelah plan disetujui, saya jalankan tahap 1 dulu (konsolidasi hub + route), verifikasi, baru sweep dead code di tahap 2 agar mudah di-review.
