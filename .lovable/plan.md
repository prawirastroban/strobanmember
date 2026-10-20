# Perbaiki posisi huruf di PDF SPK + garis roda di SPK Ban

## 1. PDF unduhan sama persis dengan pratinjau (SPK Service & SPK Ban)
Di PDF, tulisan turun ke bawah dan keluar dari kotaknya: judul kartu, status CLOSED, isi Catatan Customer, dan isi strip Tanggal & Waktu. Di pratinjau, posisinya sudah benar.
- Ganti cara pengambilan gambar PDF dengan versi yang menaruh huruf di posisi yang sama seperti di layar.
- Saat PDF dibuat, kunci tinggi baris dan perataan tengah teks di judul kartu, badge status, dan kotak waktu. Dengan begitu, posisi huruf tidak bergeser.
- Berlaku untuk kedua SPK. Isi dan susunannya tidak berubah.

## 2. SPK Ban: tanda roda depan dan belakang
Di gambar 4 ban Sebelum dan Sesudah:
- Tambah garis bentuk "T" di antara keempat ban, seperti gambar ke-3: garis tegak di tengah dan garis mendatar di antara ban atas dan ban bawah.
- Tambah label "D" (Depan) di samping baris ban atas dan "B" (Belakang) di samping baris ban bawah.
- Tanda ini tampil di pratinjau dan juga di PDF.

## Detail teknis
- `SPKPrint.tsx`: ganti `html2canvas` dengan `html2canvas-pro` (bun add). Tambah `onclone` yang memasang CSS penyeimbang di dokumen salinan: `line-height` eksplisit, inline-flex dengan align-items center untuk header kartu dan pill, serta `img{display:inline-block}`. Ini mengatasi teks yang bergeser karena preflight Tailwind.
- `BanPrintSheet.tsx`: di komponen `Axle`, bungkus grid dengan wrapper relatif. Tambah dua garis absolut (vertikal dan horizontal) plus label D/B di sisi kiri.
- Verifikasi: unduh PDF kedua jenis SPK lewat Playwright, ubah halamannya jadi gambar, lalu bandingkan dengan pratinjau.
