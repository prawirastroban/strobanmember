# Menu Promo di Pricelist

## Yang dibuat

- Tab baru **Promo** di bilah bawah (Ban · Oli · Spareparts · Jasa · Promo).
- Isi mengikuti sheet PROMO: tiap paket ditampilkan sebagai satu grup, contoh **BENSIN – DIAMOND**, Harga Jual Rp 2.100.000, Benefit, lalu daftar barang di dalamnya (nama barang, qty, satuan). ( Jangan masukan HPP, saya lupa untuk hapus kolom HPP )
- Filter di panel kanan, sama gayanya dengan tab lain: **Kategori Paket** (Bensin, Diesel, dst.) dan **Nama Paket** (Diamond, Gold, dst.).
- Pencarian mencari nama paket, kategori, barang, atau benefit.
- Pencarian, filter, dan posisi terakhir tersimpan sendiri, seperti tab lainnya.
- **Import Excel** (hanya staf) dengan format sheet PROMO: KATEGORI PAKET, NAMA PAKET, DATA BARANG, QTY, SATUAN, HPP, HARGA JUAL, BENEFIT. Baris kosong di kolom kategori/paket/harga/benefit otomatis mengikuti baris paket di atasnya. Saat import, hanya daftar promo yang diganti.
- Data dari file yang Anda unggah langsung dimasukkan (52 baris).

## Detail teknis

- Kategori baru `promo` di `pricelist_items` (pakai kolom yang ada: kategori=kategori paket, item_name=data barang, unit=satuan, qty dalam kolom tambahan bila perlu, harga HPP dan harga jual, benefit di kolom catatan); `replace_pricelist` mendukung `promo`.
- Parser `parseTireExcel` ditambah cabang `promo` dengan pengisian baris turunan (fill-down); tes ditambah di `pricelistImport.test.ts`.
- `Pricelist.tsx`: tipe `Cat` + `CATEGORIES` + filter + tampilan grup paket.