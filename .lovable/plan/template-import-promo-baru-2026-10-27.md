# Template import Promo baru

File baru tidak punya kolom HPP lagi, dan ada kolom baru **TUNE UP** (contoh: ULTIMATE).

## Perubahan
- Import Promo menerima format baru: KATEGORI PAKET, NAMA PAKET, DATA BARANG, QTY, SATUAN, HARGA JUAL, BENEFIT, TUNE UP. File lama (dengan HPP) tetap bisa dipakai.
- TUNE UP ikut tersimpan dan tampil di kartu paket, di bawah Benefit. Kolom ini boleh kosong.
- Keterangan di jendela Import diperbarui sesuai format baru.
- Data promo diganti dengan isi file Anda.

## Detail teknis
- `parseTireExcel` cabang promo: TUNE UP (fill-down dari merge) disimpan di kolom `brand`; tes ditambah.
- `PromoList` di `Pricelist.tsx` menampilkan Tune Up bila ada; deskripsi di `PricelistImportDialog`.
- Ganti baris `category='promo'` lewat SQL dari file.
