# Arahkan Pengguna Android ke Google Play

## Tujuan
Saat pengunjung membuka web dari HP Android:
1. Jika aplikasi **belum terpasang** → banner/tombol mengarah ke Google Play Store.
2. Jika aplikasi **sudah terpasang** → halaman dibuka langsung di aplikasi (bukan browser).
3. Admin bisa mengatur skema ini dari **System Management → Banner Install Aplikasi**.

## Perilaku baru per perangkat
- **Android (browser)**: tombol "Install" membuka
  `https://play.google.com/store/apps/details?id=com.bengkelstroban.app&pcampaignid=web_share`.
  Sebelum itu, aplikasi mencoba membuka lewat App Link (`intent://`) — kalau aplikasi sudah ada, langsung berpindah ke aplikasi; kalau tidak ada, otomatis jatuh ke Play Store.
- **Android (di dalam aplikasi/Capacitor)**: banner tidak muncul sama sekali (sudah seperti sekarang).
- **iPhone/iPad**: tetap memakai panduan "Tambahkan ke Layar Utama" seperti sekarang.
- **Desktop**: tetap memakai prompt install browser (PWA).

## Buka selalu lewat aplikasi
- File verifikasi App Links (`public/.well-known/assetlinks.json`) sudah ada dan cocok dengan `com.bengkelstroban.app`, jadi tautan bengkelstroban.com memang bisa dibuka langsung oleh aplikasi.
- Tambahan di web: banner tipis "Buka di aplikasi" untuk Android yang mendeteksi kemungkinan aplikasi terpasang, dengan tombol yang memicu App Link. Ini dapat dimatikan dari dashboard.
- Catatan jujur: browser tidak bisa memastikan 100% apakah aplikasi terpasang; skema `intent://` adalah cara paling andal — jika gagal terbuka, pengguna diarahkan ke Play Store.

## Pengaturan baru di dashboard (Banner Install Aplikasi)
- Toggle **Arahkan Android ke Play Store**
- Kolom **URL Play Store** (default terisi tautan di atas)
- Toggle **Tampilkan ajakan "Buka di aplikasi" untuk Android**
- Kolom judul/subtitle khusus Android (opsional; kosong = pakai teks umum)
- Pratinjau teks tombol untuk Android

## Detail teknis
- Migrasi DB: tambah kolom pada `pwa_settings` (id=1): `android_store_enabled boolean default true`, `android_store_url text`, `android_open_in_app_enabled boolean default true`, `android_banner_title text`, `android_banner_subtitle text`. Grant/RLS mengikuti pola kolom yang sudah ada di tabel ini.
- `src/hooks/usePwaSettings.ts`: tambahkan field baru + nilai default.
- `src/hooks/useInstallPrompt.ts`: ekspor helper `openAndroidApp()` / `openPlayStore()` (memakai `intent://...#Intent;scheme=https;package=com.bengkelstroban.app;S.browser_fallback_url=<play url>;end`).
- `src/components/InstallAppBanner.tsx`: cabang khusus Android → label "Buka Aplikasi"/"Dapatkan di Play Store", klik memicu App Link lalu fallback Play Store; tetap mencatat event ke `pwa_events` (`accepted`/`dismissed`, platform `android`).
- `src/components/admin/PwaSettingsManager.tsx`: form + simpan untuk kolom baru, dengan validasi URL Play Store.
- Tidak mengubah alur push notification, PWA iOS, maupun logika Capacitor yang ada.
