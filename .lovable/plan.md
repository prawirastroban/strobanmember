# Jasa dibagi dua: Service dan Ban

## Yang akan dibuat
Di tab **Jasa**, panel filter mendapat pilihan dua tombol di atas: **Service | Ban**.

- **Service** (bawaan): sama seperti sekarang — harga Gol A, B, C, D, tombol "Daftar Golongan Kendaraan" berisi tabel Gol A–D, dan Import Excel memakai format Jasa yang lama.
- **Ban**: daftar jasa pengerjaan ban dengan 3 kolom harga **Small, Medium, Large**.
  - Tombol golongan berubah menjadi "Daftar Ukuran Kendaraan" dengan tabel Small / Medium / Large (28 baris dari file Anda).
  - Import Excel memakai format baru: sheet **Jasa_Ban**, kolom KATEGORI, JASA, SMALL, MEDIUM, LARGE.
- Pencarian, filter Kategori, judul kolom rata tengah, dan tampilan ringkas berlaku sama untuk keduanya.
- 8 jasa dari file "Update_Price_Jasa_Ban" (Balancing, Spooring 3D, Tambal ban, dll.) langsung dimasukkan ke database.
- Daftar jasa Service yang sekarang (198 jasa) tidak berubah.

## Detail teknis
- Kategori baru `jasa_ban` di `pricelist_items`. Harga Small/Medium/Large memakai kolom `price_gol_a/b/c` yang sudah ada, jadi database tidak perlu diubah dan import tetap lewat `replace_pricelist` (atomik per kategori; cek apakah RPC menerima kategori baru, perluas jika dibatasi).
- `pricelistImport.ts`: cabang parsing `jasa_ban` (sheet `JASA_BAN`, wajib KATEGORI/JASA/SMALL/MEDIUM/LARGE) + test baru di `pricelistImport.test.ts`.
- `golonganKendaraan.ts`: tambah `UKURAN_COLUMNS` dan `UKURAN_ROWS` (Small/Medium/Large).
- `Pricelist.tsx`: state sub-jenis jasa (service/ban) menentukan kategori yang dimuat, kolom harga (3 kolom, lebar kolom menyesuaikan), tabel pop-up, dan format di dialog Import. Pilihan direset ke Service saat pindah tab.
- Toggle juga tampil di pop-up filter versi HP.
