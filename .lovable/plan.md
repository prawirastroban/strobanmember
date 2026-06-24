# Play Store Readiness + Maintenance Center Refactor

Mempersiapkan aplikasi untuk publikasi Google Play Store dan mengkonsolidasikan seluruh tool maintenance dalam satu "Maintenance Center" — tanpa mengubah database, endpoint, atau flow yang sudah berjalan.

---

## 1. Application Version Page (enhanced)

File: `src/components/admin/AppVersionManager.tsx`

Tambahkan tampilan read-only di bagian atas panel:
- Current Version (`APP_VERSION`)
- Build Number (`APP_BUILD_NUMBER`) — dipakai sebagai Android `versionCode`
- Release Date (dari `app_releases.published_at` terbaru)
- Changelog (dari `app_releases.release_notes` terbaru)
- Previous Version (dari row `app_releases` ke-2)
- Environment badge (Production / Staging / Development)

Route `/dashboard/app-version` tetap dipertahankan.

---

## 2. Offline Page (upgrade existing)

File: `public/offline.html` (sudah ada, akan dilengkapi)

Tambahkan:
- Logo Sahabat Stroban (dari `/favicon.png` atau brand logo)
- Status "Offline" badge (sudah ada)
- Tombol "Coba Lagi" (sudah ada)
- Tombol "Hubungi WhatsApp" → `https://wa.me/628973700800`

Tidak mengubah SPA routing. Workbox sudah dikonfigurasi fallback ke `/offline.html` di langkah sebelumnya.

---

## 3. Build Number

File: `src/lib/appVersion.ts` (sudah ada `APP_BUILD_NUMBER`)

Tampilkan di:
- `src/components/AppVersionBadge.tsx` (sudah)
- `src/components/admin/AppVersionManager.tsx` (sudah)
- `src/components/admin/system/ReleaseNotesManager.tsx` — tambahkan kolom Build Number di list & form (display only, dihitung dari version string).

---

## 4. Play Store Readiness Checklist (perluas existing)

File: `src/components/admin/system/PlayStoreReadinessChecklist.tsx` (sudah ada)

Tambahkan item check yang belum ada:
- Contact Page (legal slug `contact`)
- Error Boundary (`AppErrorBoundary` mounted di `App.tsx`)
- App Icon (`/icon-512.png` reachable)
- Splash Screen (manifest `display=standalone` + theme color)
- Firebase Connected (cek `firebase-messaging-sw.js` registered)
- Push Notification Active (cek `Notification.permission`)
- Service Worker Active (cek `navigator.serviceWorker.controller`)
- Force Update Ready (cek `app_min_version` ada)

Read-only — tidak ada tabel baru.

---

## 5. Legal Verification

Di dalam `PlayStoreReadinessChecklist`:
- Query `legal_documents` untuk slug `privacy`, `terms`, `refund`, `contact`
- Status `READY` jika `content` non-empty, `WARNING` jika kosong/null
- Link cepat ke `/legal/<slug>` untuk preview

---

## 6. Maintenance Center (new hub)

Buat route baru: `/dashboard/maintenance` → komponen `MaintenanceCenter.tsx`

Struktur tabs (reuse komponen yang ada — tidak duplikasi):
- **Application Version** → reuse `AppVersionManager`
- **Release Notes** → reuse `ReleaseNotesManager` (extended, lihat #8)
- **System Audit** → reuse `SystemAuditPanel`
- **Play Store Readiness** → reuse `PlayStoreReadinessChecklist`
- **Force Refresh** → komponen baru `ForceRefreshCenter` (lihat #7)
- **Notification Audit** → komponen baru `NotificationAuditPanel` (lihat #9)
- **PWA Audit** → komponen baru `PWAAuditPanel` (lihat #10)

Menu sidebar: tambahkan "Maintenance" di group `Pengaturan` di `src/config/dashboardMenu.ts` (Owner only). Entry "Application Version" yang baru saja ditambahkan akan diganti menjadi anak dari "Maintenance" agar tidak duplikat dengan System Management lama (System Management tetap ada untuk akses cepat).

---

## 7. Force Refresh Center

Komponen baru: `src/components/admin/system/ForceRefreshCenter.tsx` (Owner only)

UI:
- Tombol besar: **"Paksa Semua User Update"**
- Konfirmasi dialog sebelum eksekusi
- Display: Last Force Refresh, Triggered By, Version Target

Mechanism (reuse infra yang sudah ada — tidak ubah endpoint):
- Set `app_settings.app_version.force_refresh = true` + bump `app_min_version` ke `APP_VERSION` saat ini
- `VersionGate` existing akan menampilkan blocking modal ke semua client (sudah berjalan via realtime + 60s poll)
- Log triggered_by + timestamp di `app_settings` key baru `force_refresh_log` (JSON value, bukan tabel baru)
- Cache lama dibersihkan via `hardReload()` yang sudah ada (preserve Firebase cache, unregister `/sw.js` only — sudah anti refresh-loop)

Tidak menyentuh `firebase-messaging-sw.js`.

---

## 8. Release Management (extend ReleaseNotesManager)

File: `src/components/admin/system/ReleaseNotesManager.tsx`

Tambahkan field saat create/publish release (gunakan kolom existing `app_releases` — tidak ALTER TABLE):
- Version (auto dari `APP_VERSION`)
- Build Number (auto dari `APP_BUILD_NUMBER`)
- Release Date (auto `published_at`)
- Release Type: Feature / Improvement / Bug Fix / Security — simpan di kolom JSON existing (`metadata` atau salah satu kolom JSON) atau prefix di `title`
- Impact Area: Customer / Admin / Marketing / Owner / Internal System — sama
- Description (existing `release_notes`)

Jika kolom JSON tidak tersedia di `app_releases`, encode sebagai prefix terstruktur di `release_notes` (format `[type:feature][impact:customer]\n...`) sehingga tidak butuh migrasi.

Setelah cek schema saat build mode, pilih kolom yang tersedia.

---

## 9. Environment Status

Helper baru: `src/lib/environment.ts`
- Derive dari hostname: `bengkelstroban.com` → Production, `*.lovable.app` preview → Staging, `localhost` → Development.

Tampilkan badge env di:
- `AppVersionManager` header
- `SystemAuditPanel` header
- `PlayStoreReadinessChecklist` header

Tujuan: cegah salah publish.

---

## 10. Notification Audit Panel

Komponen baru: `src/components/admin/system/NotificationAuditPanel.tsx`

Query read-only ke tabel existing `push_tokens` & `push_delivery_logs`:
- Registered Devices (total)
- Android Devices (`platform = 'android'`)
- iPhone Devices (`platform = 'ios'`)
- Firebase Connected (cek sw registered + token aktif terakhir)
- Last Notification Sent (max `created_at` push_delivery_logs)
- Last Success (`status = 'sent'`)
- Last Failed (`status = 'failed'`)

Tidak ada endpoint baru.

---

## 11. PWA Audit Panel

Komponen baru: `src/components/admin/system/PWAAuditPanel.tsx`

Client-side checks:
- Manifest Valid (`fetch('/manifest.webmanifest')` + parse)
- Service Worker Active (`navigator.serviceWorker.controller`)
- PWA Installed (`matchMedia('(display-mode: standalone)')`)
- Push Permission Granted (`Notification.permission === 'granted'`)
- Badge API Supported (`'setAppBadge' in navigator`)

---

## 12. Quality Control (pre-deploy)

Reuse `PageAuditPanel` existing + tambahkan section di `PlayStoreReadinessChecklist`:
- Page mati / route mati → sudah dicek `pageRegistry`
- Route legacy aktif → cek `LegacyRedirect`
- Duplicate menu → cek `dashboardMenu` paths unique
- Halaman kosong → manual flag
- Console error → instruksi ke owner

Tidak otomatis fix, hanya report.

---

## Files Plan

**New:**
- `src/pages/MaintenanceCenter.tsx` (route page)
- `src/components/admin/system/MaintenanceCenterHub.tsx` (tabs)
- `src/components/admin/system/ForceRefreshCenter.tsx`
- `src/components/admin/system/NotificationAuditPanel.tsx`
- `src/components/admin/system/PWAAuditPanel.tsx`
- `src/lib/environment.ts`

**Edited:**
- `src/components/admin/AppVersionManager.tsx` — tambah release date, previous version, env badge
- `src/components/admin/system/PlayStoreReadinessChecklist.tsx` — tambah cek baru (icon, splash, FB, SW, push, error boundary, env)
- `src/components/admin/system/ReleaseNotesManager.tsx` — tambah type, impact area, build number
- `src/config/dashboardMenu.ts` — tambah "Maintenance" entry, restructure App Version sebagai child
- `src/App.tsx` — register route `/dashboard/maintenance`
- `public/offline.html` — tambah logo + tombol WhatsApp

**NOT changed:**
- Database schema (no migrations, no new tables, no ALTER)
- Edge functions / endpoints
- `firebase-messaging-sw.js`
- Booking, Loyalty, Referral, Notification, CRM flows
- Existing `VersionGate`, `hardReload`, force-update mechanism (hanya dipanggil dari UI baru)
- Auto-gen Supabase client/types
