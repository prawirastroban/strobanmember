# Judul kolom dan harga dibuat rata tengah

## Yang akan berubah

- Judul kolom **Nama barang**, **Grosir**, **External**, **HEB**, **Retail** (dan Gol A–D di tab Jasa, HEB/Retail di Oli, External/HEB/Retail di Spareparts) tampil di tengah kolomnya.
- Angka harga (mis. Rp 790.000) juga tampil di tengah kolomnya, sehingga sejajar dengan judulnya dan terlihat lebih rapi.
- Isi kolom nama barang — brand, ukuran/nama barang, kode, dan keterangan kendaraan — tetap rata kiri agar tetap enak dibaca.
- Berlaku di layar besar maupun HP; bingkai tabel, ketebalan baris, dan perilaku scroll tidak berubah.

## Detail teknis

Hanya di `src/pages/Pricelist.tsx`:

- Baris judul tabel (baris 242-247): menambah `text-center` pada label "Nama barang", dan mengganti `text-right` menjadi `text-center` pada wadah judul harga.
- Sel harga (baris 264): mengganti `text-right` menjadi `text-center` sehingga judul kecil (di HP) dan angka harganya sama-sama di tengah.
- Tidak ada perubahan data, aturan filter, maupun cara harga dihitung.

## Pemeriksaan

- Cek keempat tab: tiap judul kolom berada tepat di atas angka harganya, dan angka-angka tersebut sejajar satu sama lain.
- Pastikan tidak ada harga yang terpotong (mis. "Rp 1.250.000" tetap utuh) dan tidak ada garis yang bergeser.
- Cek HP 390px: label Grosir/External/HEB/Retail di atas angkanya juga rata tengah, tanpa teks terpotong.
