# Play Store Readiness Audit — Sahabat Stroban

Audit ini fokus pada **kesiapan publikasi** tanpa mengubah database, endpoint, atau menghapus fitur. Hasilnya: laporan status + sejumlah tambahan kecil di UI / dokumen yang masih kurang.

## 1. Hasil Audit (status saat ini)

| Item | Status | Catatan |
|---|---|---|
| Privacy Policy | OK (perlu verifikasi konten) | Tersedia via `/legal/:slug` (`LegalPage.tsx`). Akan dicek slug `privacy` aktif & berisi. |
| Terms & Conditions | OK (perlu verifikasi konten) | Sama: `/legal/terms`. |
| Contact Page | OK | `ContactComplaintForm.tsx` + WA `+628973700800` di Footer. |
| App Version | OK | `__APP_VERSION__` (vite.config) + `app_settings.app_version`. |
| Build Version | **KURANG** | Tidak ada build number numerik terpisah untuk Play Store (`versionCode`). |
| Changelog | OK | `app_releases` + `/update-center` + `/dashboard/app-version`. |
| Offline Page | **KURANG** | Tidak ada `offline.html` / fallback saat fetch HTML gagal. |
| Error Handling | OK | `AppErrorBoundary` aktif di `main.tsx`. |
| Loading State | OK | Loader `#il` di index.html + skeleton per page. |
| Notification Permission | OK | `NotificationPermissionBanner` + `StandaloneNotifPrompt`. |
| Firebase Push | OK | `public/firebase-messaging-sw.js` + `usePushNotifications`. |
| Deep Link | OK web | Capacitor `appId` sudah set; intent filter native di luar scope (akan dicatat sebagai Play Console step). |
| PWA Manifest | OK | `manifest.webmanifest` lengkap (icons, shortcuts, theme). |
| App Icon | OK | `pwa-192/512`, `apple-touch-icon`, favicon. |
| Splash Screen | OK | Folder `public/splash` ada + loader di `index.html`. |
| Force Update | OK | `VersionGate` + `hardReload()` di `src/lib/appVersion.ts` (clear caches kecuali firebase, unregister `/sw.js`, replace dgn `?v=`). Tidak ada loop refresh. |
| Force Update QC | OK | Cache busting via query param; SW kill-switch sudah ada di skill bawaan. |
| QC Pages | OK | `/dashboard/page-audit` (Owner) + `pageRegistry.ts` single source of truth, legacy URL pakai `<LegacyRedirect>` / `<Navigate>`. Tidak ada 404 dari URL lama. |

## 2. Yang Akan Dikerjakan (perubahan minimal)

### A. Tambah Application Version page yang lebih informatif
Path target: tetap `/dashboard/app-version` (sudah ada, dipakai oleh `AppVersionManager`). 
- Tambahkan **menu shortcut "Application Version"** di group **Maintenance** pada sidebar/dashboard menu (`src/config/dashboardMenu.ts`) bila belum ada baris terpisah.
- Pastikan panel menampilkan: **Current Version**, **Build Number** (turunan dari `APP_VERSION` → format `YYYY.MMDD.HHmm` di-convert ke integer monotonic), **Release Date** (dari `app_releases.released_at` terbaru), **Changelog** (list dari `app_releases`).
- Tidak mengubah tabel/endpoint — hanya menambah komputasi di komponen.

### B. Offline Fallback Page (ringan)
- Tambah `public/offline.html` (statik, brand-aware, tombol "Coba lagi").
- Update `vite.config.ts` Workbox `runtimeCaching` `html-pages` agar fallback ke `/offline.html` saat NetworkFirst gagal & cache kosong. Tidak menyentuh `navigateFallback` utama (`/index.html`) supaya SPA routing tetap utuh.

### C. Build Number (versionCode) untuk Play Store
- Tambah helper `src/lib/appVersion.ts` → `APP_BUILD_NUMBER` = integer dari APP_VERSION (mis. `2026.0118.1430` → `202601181430`). 
- Tampilkan di `AppVersionBadge` (variant card) dan `AppVersionManager`. 
- Catat di README/release notes sebagai nilai untuk `android/app/build.gradle` `versionCode` saat build native.

### D. Pre-Publish QC Checklist Panel
- Tambah panel **"Play Store Readiness"** di `SystemAuditPanel` (tab System Audit) — read-only checklist berdasarkan `pageRegistry` + `app_settings` + `app_releases` (versi terbaru ada changelog? privacy/terms slug aktif? force_refresh tidak menyala permanent? dll).
- Tidak membuat tabel baru.

### E. Verifikasi konten Legal
- Jalankan query ke `legal_documents` (atau setara) untuk memastikan slug `privacy`, `terms`, `refund` punya konten non-kosong. Jika kosong, beri tahu user untuk mengisi via `/dashboard/legal` (tidak auto-isi karena copywriting butuh approval).

## 3. Yang TIDAK Akan Diubah
- Skema DB, RLS, edge functions, endpoint.
- Flow booking / pembayaran / loyalty / push.
- Route existing — semua tetap; hanya menambah `/offline.html` statik.
- `capacitor.config.ts` `server.url` (hot-reload) — biarkan, native build akan dihandle saat export ke GitHub.

## 4. Catatan Teknis (untuk reviewer)
```
src/
  lib/appVersion.ts           +APP_BUILD_NUMBER
  components/AppVersionBadge.tsx   tampilkan build number
  components/admin/AppVersionManager.tsx   tampilkan build+release date
  components/admin/system/SystemAuditPanel.tsx  + PlayStoreReadinessChecklist
  config/dashboardMenu.ts     pastikan entry Maintenance → Application Version
public/
  offline.html                NEW (brand red, retry button)
vite.config.ts                Workbox: fallback offline.html untuk navigations
```

## 5. Item yang Memerlukan Aksi User di Play Console (di luar codebase)
- Upload Privacy Policy URL: `https://www.bengkelstroban.com/legal/privacy`
- Data safety form (lokasi, kontak, notif) sesuai izin di app.
- Sign APK/AAB dengan keystore (di-handle saat export Capacitor → Android Studio).
- Tetapkan `versionCode` ke nilai `APP_BUILD_NUMBER` yang ditampilkan.

Lanjutkan dengan implementasi A–E di atas?
