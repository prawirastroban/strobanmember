# Plan: Turunkan Posisi Ilustrasi Kategori Servis

## Tujuan
Menurunkan posisi gambar/ilustrasi 3D pada kartu kategori layanan di home mobile sedikit ke bawah, tanpa mengubah elemen lain.

## Perubahan
- File: `src/components/mobile/home/ServiceCategoryGrid.tsx`
- Baris: `204-218` (style `img` di dalam tombol kategori)
- Aksi: ubah nilai `top` pada style inline gambar dari `-22` menjadi `-12` (turun 10px).
- Elemen lain (grid, card, bayangan, teks, dll.) tidak diubah.

## Hasil yang Diharapkan
Ilustrasi 3D pada tile "Ganti Oli", "Ganti Ban", "Paket Servis", dan "Promo Servis" terlihat sedikit lebih rendah, lebih menyatu dengan card putih di bawahnya.
