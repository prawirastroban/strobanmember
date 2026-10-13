# Garis tepi membulat untuk tabel pricelist

## Yang akan berubah

Daftar pricelist (ban, oli, spareparts, jasa) diberi **garis tepi** dengan **sudut membulat**, membungkus kepala kolom (Nama barang / Grosir / External / HEB / Retail) beserta seluruh baris data.

- Bingkai tipis senada garis pemisah yang sudah ada, jadi tampilan tetap ringan dan rapi.
- Sudut membulat di keempat ujung bingkai; kepala kolom yang berlatar dan baris terakhir ikut terpotong mengikuti lengkung sudut, tidak ada pojok yang "keluar".
- Baris tetap hanya dipisahkan garis tipis di dalam bingkai; isi tabel, lebar kolom harga, dan posisi search bar tidak berubah.
- Berlaku untuk semua tab (Ban, Oli, Spareparts, Jasa), di layar besar maupun di HP.
- Panel Filter di kanan tetap seperti sekarang (sudah punya bingkai membulat sendiri).

## Detail teknis

- Satu perubahan di `src/pages/Pricelist.tsx` pada pembungkus daftar (baris 241):
  - dari `min-w-0 max-w-full overflow-hidden`
  - menjadi `min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/60`
- `overflow-hidden` dipertahankan agar latar kepala kolom dan baris terakhir terpotong mengikuti sudut.
- Radius `rounded-2xl` (16px) agar konsisten dengan kartu lain di aplikasi; mudah diganti bila ingin lebih kaku (rounded-xl) atau lebih lembek (rounded-3xl).
- Tidak ada perubahan data, query, maupun aturan akses.

## Pemeriksaan

- Buka /pricelist sebagai staf, cek keempat tab: bingkai membulat tampil utuh, tidak ada teks terpotong atau kolom harga bergeser.
- Cek posisi scroll (search bar menempel di bawah navbar, tabel tetap terbaca) dan tampilan HP 390px: tidak ada garis terputus atau gelembung horizontal.
