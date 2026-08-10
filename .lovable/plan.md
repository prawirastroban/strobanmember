# Perbaikan: Gambar tombol layanan tidak muncul di aplikasi Android

## Penyebab
Empat ilustrasi kartu layanan (Ganti Oli, Ganti Ban, Paket Servis, Promo Servis) tidak ikut dipaketkan ke dalam aplikasi. Gambar itu dipakai lewat pointer aset Lovable yang isinya alamat relatif (`/__l5e/assets-v1/...`).

Di browser, alamat relatif itu diterjemahkan ke domain website sehingga gambar tampil. Di aplikasi Android (Capacitor), halaman dibuka dari berkas lokal `https://localhost`, jadi alamat yang sama menunjuk ke dalam paket aplikasi — file-nya tidak ada di sana, hasilnya gambar kosong. Gambar lain tetap tampil karena berasal dari file bundel atau URL penuh (https://...).

## Perbaikan
Jadikan keempat ilustrasi sebagai file gambar nyata di dalam proyek sehingga ikut dibundel saat build dan `npx cap sync`:

1. Unduh keempat PNG dari CDN, kompres/ubah ukuran (saat ini ~2 MB per file, terlalu berat untuk aplikasi) menjadi PNG transparan lebar ~512px, target di bawah ~150 KB per file.
2. Simpan sebagai `src/assets/service-oil.png`, `service-tire.png`, `service-maintenance.png`, `service-discount.png`.
3. Ubah `src/components/mobile/home/ServiceCategoryGrid.tsx` agar mengimpor file gambar tersebut (ES import) menggantikan 4 impor `*.asset.json`.
4. Hapus 4 file pointer `src/assets/*.png.asset.json` yang sudah tidak dipakai.

Tampilan, ukuran, posisi, bayangan, dan logika pemetaan kategori tidak diubah — hanya sumber gambarnya.

## Verifikasi
- Cek preview mobile 393px: keempat ilustrasi tetap tampil sama seperti sekarang.
- Pastikan tidak ada lagi referensi `__l5e` di kode aplikasi.

## Setelah disetujui (langkah Anda di Android Studio)
`git pull` → `npm install` → `npm run build` → `npx cap sync android` → jalankan ulang aplikasi.

## Catatan teknis
- File terdampak: `src/components/mobile/home/ServiceCategoryGrid.tsx` (baris impor + `pickArt`), penambahan 4 file gambar di `src/assets/`, penghapusan 4 file `.asset.json`.
- Alternatif yang tidak dipilih: memakai URL absolut `https://bengkelstroban.com/__l5e/...`. Cara ini membuat kartu layanan bergantung pada koneksi internet dan gagal saat offline, jadi bundel lokal lebih tepat untuk aplikasi native.