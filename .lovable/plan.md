## Tujuan
Menampilkan informasi versi aplikasi di tempat yang konsisten, memakai **versi live dari server** (`app_settings.app_version`) sebagai sumber kebenaran tunggal — bukan build lokal.

## Yang akan dibuat / diubah

### 1. Hook ringkas `useLiveAppVersion`
`src/hooks/useLiveAppVersion.ts` — wrapper kecil di atas `useAppVersion()` yang sudah ada, mengembalikan hanya `{ version, releasedAt, loading }`. Tidak ada query baru, hemat request karena pakai realtime + poll yang sudah berjalan.

### 2. Komponen `AppVersionBadge`
`src/components/AppVersionBadge.tsx` — pill kecil glassmorphism bertuliskan `v2.6.2` (atau "Memuat…"). Variant:
- `inline` — teks polos untuk footer
- `pill` — badge dengan ikon Rocket untuk Profile

### 3. Footer Dashboard
Tambah baris tipis di bawah `AdminLayout` (di `<main>` atau sebagai `<footer>` baru di dalam panel konten):
```
© 2026 Sahabat Stroban Service · v2.6.2
```
Ditempel di dalam container scroll, sticky-bottom opsional. Hanya muncul di area dashboard.

### 4. Profile User (`src/pages/Profile.tsx`)
Tambah kartu kecil "Versi Aplikasi" di paling bawah halaman, menampilkan:
- Versi live: `v2.6.2`
- Tanggal rilis (format `13 Jun 2026`)
- Tombol "Cek Pembaruan" → memanggil `hardReload()` jika user tertinggal

### 5. System Management → tab Versi Aplikasi
Tidak ada halaman baru. Tetap pakai `SystemManagementHub`. Sesuai jawaban Anda:
- **Current Version** → sudah ada di tab "Versi Aplikasi" (`AppVersionManager`)
- **Deployment History** → tab "Deployment History" (sudah ada)
- **Release Notes** → tab "Release Notes" (sudah ada)
- **Force Update** → toggle "Paksa Refresh Semua User" di `AppVersionManager` (sudah ada)
- **Users Pending Update** → tambahkan filter chip di `UserSessionsPanel` (Semua / Up-to-date / Tertinggal), plus tombol "Force refresh user ini"

### 6. User Sessions Panel — info versi
Panel **sudah menampilkan**: `current_version`, `update_status`, `last_seen_at`, `browser`, `os` (data dari tabel `app_version_clients` via hook `useClientVersionTracker`).
Penyempurnaan kecil:
- Tambah kolom/label "Versi" jelas
- Badge warna: hijau = up-to-date, kuning = behind, merah = jauh tertinggal (bandingkan dengan `latest` dari `app_settings`)
- Filter chip "Hanya yang tertinggal"

## Yang TIDAK diubah
- Database & RLS (tidak perlu migrasi — `app_settings` & `app_version_clients` sudah ada)
- Edge functions
- `AppVersionManager` UI utama (tetap)
- Mekanisme `VersionGate` & `hardReload`

## Catatan jawaban Anda
> "User session apakah memunculkan informasi?"

**Ya, sudah** — `UserSessionsPanel.tsx` sudah menarik `current_version`, `browser`, `os`, `last_seen_at`, `update_status` dari `app_version_clients` untuk setiap user yang pernah login. Yang perlu hanya **memperjelas tampilan** (label "Versi", badge warna, filter "tertinggal") supaya berfungsi sebagai "Users Pending Update".
