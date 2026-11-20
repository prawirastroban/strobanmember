# Latar belakang polos

## Yang berubah

- Latar belakang aplikasi di mode terang jadi putih susu (#FEFCFF), dan garis-garis gelombang merah serta kuning dihapus.
- Mode gelap menjadi hitam polos (#000000), tanpa garis.
- Berlaku di semua halaman yang sekarang memakai latar garis, baik di HP maupun komputer.

## Yang tidak diubah

- Bilah atas merah di Beranda, kartu, tombol, menu bawah, tata letak, dan ikon.

## Detail teknis

- `src/index.css`: tambah aturan penutup di akhir file:
  - `html:not(.dark) .home-canvas::after, html:not(.dark) .web-glass::after { background: #FEFCFF !important; }`
  - `html.dark .home-canvas::after, html.dark .web-glass::after { background: #000 !important; }`
  - Token `--background` mode terang diubah ke `#FEFCFF` (dalam format HSL).
- Pengecekan di HP dan komputer, mode terang dan gelap, pada Beranda, Katalog, dan Akun.
- Perkiraan: 1 kredit.
