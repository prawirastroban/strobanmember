# Latar belakang putih polos

## Yang berubah
- Latar belakang aplikasi di mode terang jadi **putih polos** (#FFFFFF). Garis-garis gelombang merah dan kuning dihapus, dan tidak ada lagi warna putih susu.
- Berlaku di semua halaman yang sekarang memakai latar garis, baik di HP maupun komputer.

## Yang tidak diubah
- Bilah atas merah di Beranda, kartu, tombol, menu bawah, tata letak, dan ikon.
- Mode gelap tetap hitam dengan garis merah, kecuali Anda minta ikut diubah.

## Detail teknis
- `src/index.css`: tambah satu aturan penutup di akhir file untuk mode terang, yaitu `html:not(.dark) .home-canvas::after, html:not(.dark) .web-glass::after { background: #fff !important; }`. Token `--background` juga diubah ke `0 0% 100%`.
- Pengecekan di HP dan komputer pada Beranda, Katalog, dan Akun.
- Perkiraan: 1 kredit.
