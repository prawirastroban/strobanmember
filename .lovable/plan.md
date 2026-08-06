# Hilangkan Garis Tepi Hitam pada Kartu Katalog

## Temuan Verifikasi
Screenshot kartu layanan di `/katalog` masih menunjukkan garis tepi gelap. Sumbernya bukan sheet detail, melainkan kartu daftar layanan itu sendiri: setiap kartu memakai `border border-border` yang pada tema gelap tampil sebagai garis hitam mengelilingi kartu (dan terlihat mengelilingi gambar karena gambar menempel di tepi kartu).

## Perubahan
1. Kartu layanan di `src/pages/Katalog.tsx`: hapus garis tepi (`border border-border`) dan gunakan pemisahan visual berbasis bayangan lembut saja, sehingga tidak ada garis hitam.
2. Efek hover tetap terjaga: ganti `hover:border-primary/60` dengan penekanan bayangan/ring merah lembut agar interaksi tetap terasa tanpa memunculkan garis gelap saat idle.
3. Sisa kartu (radius, padding, layout) tidak diubah.

## Verifikasi
Ambil ulang screenshot kartu pertama di `/katalog` untuk memastikan tepi hitam hilang.
