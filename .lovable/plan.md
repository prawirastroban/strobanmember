# Ketentuan Spareparts di Panel Filter

## Tujuan
Menambahkan kotak "Ketentuan Spareparts" di panel filter, hanya pada tab Spareparts, tepat di bawah judul "Filter" dan di atas grup "Brand".

## Isi ketentuan (persis seperti yang diminta)
Beli di luar:
- Rp 0 s/d Rp 50.000 → dibagi 50%
- Rp 51.000 s/d Rp 250.000 → dibagi 60%
- Rp 251.000 s/d Rp 500.000 → dibagi 65%
- Rp 501.000 ke atas → dibagi 70%
- Terkecuali Filter → dibagi 40%

## Perubahan
- `src/pages/Pricelist.tsx` (komponen `FilterPanel`):
  - Tambah blok info kecil bergaya konsisten dengan panel (kotak rounded, border tipis, teks kecil) berisi judul "Ketentuan Spareparts (beli di luar)" dan daftar rentang harga di atas.
  - Blok hanya dirender saat `category === "sparepart"`, sebelum daftar grup filter (sehingga otomatis muncul juga di pop-up filter versi HP).
  - Format harga memakai gaya Rupiah yang sudah dipakai halaman (`Rp 50.000`).
- Tidak ada perubahan data, database, atau logika harga — ini murni teks informasi.

## Verifikasi
- Buka tab Spareparts: kotak ketentuan tampil di atas Brand, di panel desktop dan di sheet filter HP.
- Tab Ban, Oli, dan Jasa: kotak tidak tampil.
- Cek tidak ada overflow di lebar HP (390px).
