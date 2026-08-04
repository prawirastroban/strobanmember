# Keluhan on-demand + kartu Layanan baru

## 1. Fitur keluhan muncul hanya saat searchbar diklik
Saat ini blok keluhan/booking (`HeroBookingForm variant="form"`) selalu tampil di beranda.

Perubahan:
- Blok tersebut disembunyikan secara default.
- Ketika span "Apa masalah mobil anda ?" di searchbar diklik, blok muncul (animasi fade/slide) langsung di bawah searchbar, mode "Keluhan" aktif, input otomatis fokus.
- Klik lagi (atau tombol tutup kecil) menyembunyikan kembali.
- Toggle Booking/Keluhan yang sudah ada tetap dipertahankan di dalam blok.

Teknis: state `showKonsultasi` di `src/pages/Index.tsx` yang di-pass ke `HeroBookingForm`, dipicu lewat event `open-konsultasi` yang sudah dipakai searchbar. Tidak ada perubahan logika chatbot/booking.

## 2. UI Layanan mengikuti gambar
`src/components/mobile/home/ServiceCategoryGrid.tsx` diubah dari 4 ikon bulat kecil menjadi 4 kartu vertikal besar sejajar:
- Kartu tinggi (rasio potret), sudut membulat, bayangan lembut.
- 3 kartu pertama: latar merah brand, teks putih tebal 2 baris di kiri-bawah (mis. "Ganti Oli", "Ganti Ban", "Paket Servis").
- Kartu terakhir (Promo): latar putih/card dengan teks merah.
- Label tetap diambil dari kategori database, tanpa mengubah data atau navigasi ke `/katalog?category=...`.
- Judul "Layanan" tetap; warna memakai token desain (primary / card) agar aman di mode gelap.

## Tidak berubah
Database, kategori, routing, flow booking, dan komponen lain di beranda.
