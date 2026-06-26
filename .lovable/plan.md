## Feature Graphic Play Store — Sahabat Stroban

Membuat **feature graphic** berukuran **1024 × 500 px** (format JPG, < 15 MB) sesuai spesifikasi Google Play Console untuk listing aplikasi `com.bengkelstroban.app`.

### Konsep Desain
Mengikuti identitas visual project (liquid glass, aksen merah neon `#ff2b2b`, gaya Apple-minimal):
- **Latar**: gradient gelap (slate/abu kebiruan) dengan glow merah halus di sisi kanan untuk kedalaman.
- **Sisi kiri (60%)**: 
  - Logo + wordmark "Sahabat Stroban"
  - Headline besar: **"Servis Mobil Lebih Mudah"**
  - Sub-headline: *Booking online, loyalty rewards & promo eksklusif*
  - Chip fitur kecil: "Booking Online · Poin Loyalty · Promo Eksklusif"
- **Sisi kanan (40%)**: 
  - Mockup tampilan aplikasi mobile (screenshot homepage) dengan frame glass + bayangan lembut, sedikit dimiringkan.
  - Aksen lingkaran glow merah di belakangnya.
- **Aman dari crop**: elemen penting ditempatkan di tengah ±80 px (Play Store sering memotong tepi untuk preview).

### Cara Pembuatan
Menggunakan script Python (Pillow) untuk merender komposisi secara presisi pada kanvas 1024×500 — bukan AI image generator — supaya teks tajam, warna brand konsisten, dan resolusi pixel-perfect. Logo diambil dari `public/` (favicon/logo brand) dan mockup HP dirender sebagai bentuk dengan screenshot homepage di dalamnya.

### Output
- File tersimpan di `/mnt/documents/play-store-feature-graphic.jpg`
- Disertakan tag `<presentation-artifact>` agar user bisa langsung unduh.
- Bila perlu varian (mis. tanpa mockup, tagline berbeda), tinggal beri tahu — akan dibuat versi `_v2`.

### Pertanyaan opsional (boleh dilewati)
Headline default: **"Servis Mobil Lebih Mudah"**. Bila ingin teks lain, beri tahu sebelum implement.
