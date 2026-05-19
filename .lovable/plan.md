## Masalah

Favicon di **tab browser desktop** sudah benar karena dirender via `BrandingSync.tsx` (membaca dari Supabase). Tapi di **mobile (PWA / Add to Home Screen / preview Google)** masih memakai logo Lovable karena:

1. `public/manifest.webmanifest` hanya mendaftarkan `/favicon.ico` sebagai `192x192 image/x-icon` — tidak valid. Android Chrome menolak ikon ini dan jatuh kembali ke default.
2. `public/pwa-512x512.png` sebenarnya berdimensi **1487x256** (file OG image yang salah disalin) — bukan kotak, jadi tidak dipakai sebagai install icon.
3. Manifest tidak punya entri 512x512, tidak ada `purpose: "any maskable"`, dan `name`/`short_name` belum konsisten dengan brand "Sahabat Stroban".
4. File favicon statis di `public/` di-baked saat build. Setelah ganti di Branding Settings, perlu **Publish ulang** agar Google & install banner ikut update.

## Yang akan dikerjakan

### 1. Regenerasi ikon PWA dari `public/favicon.png` (500x500)
- Buat ulang `public/pwa-192x192.png` (192x192, dari favicon)
- Buat ulang `public/pwa-512x512.png` (512x512 kotak benar, dari favicon)
- (favicon.png & favicon.ico sudah benar, tidak diubah)

### 2. Perbaiki `public/manifest.webmanifest`
```json
{
  "name": "Sahabat Stroban - Servis Mobil",
  "short_name": "Sahabat Stroban",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#E53935",
  "icons": [
    { "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 3. Tambahkan link manifest di `index.html`
Saat ini `index.html` belum punya `<link rel="manifest" href="/manifest.webmanifest" />`. Tanpa ini browser mobile tidak membaca manifest sama sekali — inilah penyebab utama logo Lovable tetap muncul saat install/preview. Tambahkan baris ini di `<head>`.

### 4. Catatan ke user (tanpa code change)
- Setelah ini selesai, **Publish ulang** lalu di HP **uninstall PWA lama** dan **clear cache browser** (atau buka di Incognito) sebelum re-install — Android meng-cache ikon manifest secara agresif.
- Untuk Google SERP favicon, tunggu 1-7 hari untuk re-crawl.

## File yang berubah

- `public/manifest.webmanifest` (perbaiki konten)
- `public/pwa-192x192.png` (regenerate kotak 192)
- `public/pwa-512x512.png` (regenerate kotak 512 — sekarang salah)
- `index.html` (tambah `<link rel="manifest">` + `<meta name="application-name">`)

Tidak ada perubahan backend, DB, atau RLS.
