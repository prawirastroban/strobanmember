# Harga promo dari sel Excel yang di-merge

## Masalah
Di Excel, satu harga yang di-merge ke dua baris hanya tersimpan di baris pertama. Akibatnya, MOBIL SUPER ALL IN ONE 0W-20 LTR tampil tanpa harga, padahal harganya sama dengan baris GLN (Rp 700.000).

## Perbaikan
- Saat membaca file, isi setiap sel yang di-merge disalin ke semua baris yang termasuk dalam merge itu. Ini berlaku untuk semua kolom, termasuk Harga Jual dan Benefit.
- Data promo yang sudah masuk diganti dengan hasil baca ulang file Anda. Setelah itu, baris 0W-20 LTR ikut tampil dengan harga Rp 700.000.
- Kalau semua barang dalam satu paket punya harga yang sama, harga cukup tampil di judul paket dan tidak diulang di tiap baris barang.

## Detail teknis
- `parseTireExcel` membaca `ws["!merges"]`, lalu menyalin nilai sel kiri-atas ke seluruh range merge sebelum `sheet_to_json`.
- Tes ditambah di `pricelistImport.test.ts`: harga yang di-merge harus terbaca di kedua baris.
- Baris `category='promo'` diganti dengan hasil parse ulang file Anda.
