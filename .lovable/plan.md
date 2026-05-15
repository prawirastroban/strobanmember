## Tujuan

Pastikan setting **Judul Tab Browser** dan **Deskripsi Situs (SEO)** di `/dashboard/marketing/branding` benar-benar diterapkan ke seluruh meta head, semua halaman, dan tidak lagi ditimpa oleh nilai hardcoded.

## Perubahan

### 1. `src/components/BrandingSync.tsx` — perluas cakupan & buat persisten

- Tambahkan update untuk tag berikut (buat jika belum ada):
  - `<meta property="og:title">` ← `siteTitle`
  - `<meta property="og:description">` ← `siteDescription`
  - `<meta property="og:site_name">` ← `brandName`
  - `<meta name="twitter:title">` ← `siteTitle`
  - `<meta name="twitter:description">` ← `siteDescription`
  - `<meta name="apple-mobile-web-app-title">` ← `brandName`
- Re-apply `document.title` setiap perubahan route memakai `useLocation()` dari `react-router-dom`, sehingga halaman manapun yang sempat menimpa title akan di-restore ke `siteTitle`.
- Tetap hormati page yang men-set title spesifik: deteksi via `data-page-title` flag — opsional, default selalu apply brand title (lihat keputusan di langkah 2).

### 2. Hapus penimpaan title hardcoded di halaman publik

- `src/pages/Promo.tsx`, `src/pages/Katalog.tsx`, `src/pages/Cabang.tsx`: hapus baris `document.title = "..."`. Biarkan `BrandingSync` yang mengatur judul global. (Jika nanti ingin per-page title, dapat memakai react-helmet-async, tapi di luar scope sekarang.)

### 3. Klarifikasi UI di `BrandingManager`

- Tambahkan helper text kecil di bawah field "Judul Tab Browser":
  - "Perubahan ini langsung terlihat di tab browser saat halaman dibuka di domain publik. Tab editor Lovable (lovable.dev) tetap menampilkan nama project Lovable dan tidak bisa diubah dari sini."

### 4. Verifikasi manual

- Setelah save di /dashboard/marketing/branding, buka tab lain (mis. Beranda, Promo, Katalog, Cabang) dan pastikan `document.title`, `og:title`, dan `apple-mobile-web-app-title` mengikuti nilai baru tanpa reload manual (realtime channel `app_branding` sudah aktif di hook).

## Tidak diubah

- `index.html` static head tetap sebagai fallback default untuk crawler yang tidak meng-eksekusi JS.
- Schema DB / RLS / storage tidak berubah.
- Tidak menambah dependency baru (helmet) — perubahan murni DOM mutation di `BrandingSync`.