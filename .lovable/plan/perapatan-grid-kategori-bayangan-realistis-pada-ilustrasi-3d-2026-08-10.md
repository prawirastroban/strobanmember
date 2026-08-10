# Perapatan Grid Kategori & Bayangan Realistis pada Ilustrasi 3D

## Tujuan
Membuat grid kategori layanan di homepage mobile terlihat lebih "rapat" (jarak vertikal lebih kecil) dan menambahkan bayangan pada ilustrasi 3D agar terlihat lebih realistis seperti mockup referensi.

## Perubahan yang Akan Dilakukan
1. **Perapatan vertikal**
   - Kurangi `padding-top` grid dari `28px` menjadi sekitar `16px`.
   - Naikkan posisi gambar (kurangi overhang) dari `top: -30` menjadi sekitar `top: -22`.
   - Kurangi padding bawah card dari `8px` menjadi sekitar `6px`.
   - Sesuaikan `aspect-ratio` card dari `0.88` menjadi sekitar `0.95` agar card lebih pendek namun label tetap nyaman dibaca.
   - Sinkronkan shimmer loader dengan aspect-ratio baru.

2. **Bayangan realistis pada ilustrasi**
   - Perkuat `filter: drop-shadow` pada `<img>` dengan dua lapisan bayangan (lebih lembut di dekat objek + lebih lebar & redup di bawah).
   - Tambahkan elemen bayangan "lantai" di bawah gambar berupa elips radial blur (`radial-gradient` + `filter: blur`) dengan opacity rendah, sehingga objek 3D tampak bertumpu pada card.
   - Pastikan bayangan tidak mengganggu klik/tap (pointer-events none).

3. **Konsistensi visual**
   - Pertahankan label 2 baris dan urutan tile sesuai mockup.
   - Jaga jarak antar tile tetap `8px`.

## Teknis
- File target: `src/components/mobile/home/ServiceCategoryGrid.tsx`.
- Semua styling tetap inline/CSS-in-JS agar tidak merusak pola glassmorphism/dark mode yang sudah ada.
- Tidak mengubah data kategori atau logika navigasi.

## Verifikasi
- Jalankan build lokal untuk memastikan tidak ada error TypeScript.
- Ambil screenshot mobile via Playwright untuk memastikan grid lebih rapat dan bayangan terlihat pada elemen gambar.
