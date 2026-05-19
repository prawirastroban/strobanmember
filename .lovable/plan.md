## Masalah

Di hasil pencarian Google (dan saat halaman pertama kali dibuka, sebelum JS jalan), favicon yang tampil adalah ikon default Lovable (lingkaran gradien hati), bukan logo yang sudah diupload di **Dashboard → Marketing → Branding**.

Penyebabnya:
- `index.html` **tidak punya** `<link rel="icon">` sama sekali, sehingga browser & Google jatuh ke `/favicon.ico` lama (sisa template Lovable).
- `<title>` dan `<meta description>` di `index.html` masih hard-coded `"Bengkel Stroban - Servis Mobil & Loyalty Rewards"`, bukan dari brand settings.
- `BrandingSync.tsx` sudah benar — tapi hanya berjalan **setelah** React + query Supabase selesai. Crawler Google dan tampilan tab sebelum JS load tidak akan melihatnya.

Saat ini di database:
- `brand_name = "Autocare"`, `favicon_url` & `logo_light_url` sudah diisi via Supabase Storage.

## Rencana Perbaikan

### 1. Bake favicon brand ke `public/`
- Download file dari `favicon_url` saat ini → simpan jadi `public/favicon.png` (dan timpa `public/favicon.ico` lama biar tidak override).
- Download `logo_light_url` → simpan jadi `public/og-image.png` untuk preview share (WhatsApp/Twitter/FB).

### 2. Update `index.html`
- Tambah tag favicon eksplisit:
  ```html
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="shortcut icon" href="/favicon.png" />
  ```
- Ganti `<title>` & `<meta name="description">` mengikuti brand "Sahabat Stroban" (default dari DB).
- Ganti `apple-mobile-web-app-title`, `og:site_name`, `og:title`, `twitter:title` → "Sahabat Stroban".
- Tambah `<meta property="og:image" content="/og-image.png">` dan `twitter:image`.
- Update `apple-touch-icon` agar pakai logo brand juga.

### 3. Sinkronisasi otomatis ke depannya
Tambah catatan kecil di `BrandingManager.tsx` (UI) bahwa: perubahan favicon di halaman ini langsung memperbarui tab browser saat aplikasi terbuka, tapi **untuk mengganti favicon yang tampil di hasil Google** perlu redeploy (karena file di-bake ke build statis).

> Opsi lanjutan (di luar scope sekarang, sebut saja): bikin edge function `og-image` yang return-redirect ke favicon brand terkini, lalu reference `/_og` di index.html → favicon Google selalu ikut DB tanpa redeploy. Saya akan tunggu konfirmasi sebelum menambahkan ini.

### 4. Refresh cache
- Catatan: Google butuh re-crawl (bisa beberapa hari) untuk menampilkan favicon baru di SERP. Bisa dipercepat dengan request re-index di Google Search Console.

## File yang berubah
- `public/favicon.png` (baru, dari Supabase favicon_url)
- `public/og-image.png` (baru, dari Supabase logo_light_url)
- `public/favicon.ico` (dihapus / ditimpa)
- `index.html` (favicon link, title, description, og tags)
- `src/components/admin/BrandingManager.tsx` (catatan kecil ttg cache Google)

Tidak ada perubahan backend / DB / RLS.
