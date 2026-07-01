## Phase 1 — Version Registry

Membangun fondasi registry versi di halaman **Dashboard → Versi Aplikasi** (`/dashboard/app-version`). Tanpa mengubah login Google, routing, Service Worker, atau membuat popup / force update / auto-refresh.

### 1. Perluasan data (aditif, tidak mengubah struktur existing)

Tambah kolom di `public.app_releases`:
- `build_number` (integer) — terpisah dari version.
- `release_channel` (text, default `production`, check-in: `production` | `beta`).

Status `app_releases.status` sudah mendukung `draft` / `published`; tambahkan value `archived` (hanya perluasan check constraint, tidak mengubah baris lama).

Kolom existing yang dipakai apa adanya: `version`, `released_at` (Release Date), `released_by` (Release By), `status` (Deployment Status).

Tidak menambah tabel baru. Tidak mengubah `app_settings` (`app_version` / `app_min_version` tetap sumber runtime untuk fitur lama).

### 2. Service internal — `src/services/versionRegistry.ts` (baru)

Satu service khusus, akan dipakai phase berikutnya. Membaca dari `app_releases` (rilis published terbaru) dengan fallback ke `app_settings.app_version`.

Output (`VersionRegistryInfo`):
```
currentVersion: string
buildNumber: number
releaseDate: string | null
releaseBy: { id, name, email } | null
deploymentStatus: 'draft' | 'published' | 'archived'
releaseChannel: 'production' | 'beta'
```

API:
- `getVersionRegistry(): Promise<VersionRegistryInfo>`
- `useVersionRegistry()` hook (thin wrapper, realtime subscribe `app_releases`).

Tidak menyentuh `useAppVersion`, `VersionGate`, `updateChecker`, atau SW.

### 3. UI — `src/components/admin/AppVersionManager.tsx` (extend, tidak refactor)

Menambah panel read-only "Version Registry" di atas kartu existing, menampilkan:
- Current Version (`v{version}`)
- Build Number (`#{build_number}`, ditampilkan terpisah dari versi)
- Release Date (format `15 Oct 2023, HH:mm`)
- Deployment Status (badge: Draft / Published / Archived)
- Release Channel (badge: Production / Beta)
- Release By (nama + email dari `profiles`)

Form existing (bump patch/minor/major, notes, force refresh, publish/save draft) tetap berjalan; tambah dua input opsional:
- Build Number (auto-suggest = angka dari `APP_BUILD_NUMBER`, editable).
- Release Channel selector (Production / Beta, default Production).

Saat Publish/Save Draft, kolom baru ikut ditulis ke row `app_releases` yang sudah dibuat oleh flow existing. Perilaku `app_settings` tetap.

### 4. Yang TIDAK dibuat di phase ini

Version Compare, Force Update, Auto Refresh, Popup Update, Release Notes viewer baru, Cache Manager, User Update Status, Deployment History. Struktur di atas menyisakan ruang: service tunggal + kolom channel/build/status siap dikonsumsi phase berikutnya tanpa migrasi ulang.

### Detail teknis

- Migrasi: `ALTER TABLE public.app_releases ADD COLUMN build_number integer`, `ADD COLUMN release_channel text NOT NULL DEFAULT 'production' CHECK (release_channel IN ('production','beta'))`, dan perluasan check `status` untuk mencakup `archived`. GRANT existing tidak berubah (tabel sudah ada).
- Realtime channel `app_version_watch` yang sudah ada tetap dipakai; service baru subscribe di channel terpisah agar tidak mengganggu `useAppVersion`.
- Tidak ada perubahan pada `src/lib/appVersion.ts`, `VersionGate.tsx`, `registerSW.ts`, `firebase-messaging-sw.js`.
