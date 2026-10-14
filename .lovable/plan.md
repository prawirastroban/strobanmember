# Satu Judul Utama di Seluruh Dashboard

## Tujuan
Merapikan seluruh halaman dashboard agar masing-masing memiliki **satu judul utama**, tanpa mengubah fungsi, data, hak akses, atau alur kerja.

## Hasil pemeriksaan awal
- Header dashboard menampilkan judul halaman, sementara beberapa panel menampilkan judul utama lagi di bawahnya.
- Contoh terkonfirmasi: Configuration + SPK Configuration, Pengaturan Cabang, Customer Management, Daftar Laporan, Aturan Saldo Cashback, Custom Report Builder, dan Pusat Kontrol Operasional.
- Judul header saat ini bergantung pada adanya deskripsi; halaman tanpa deskripsi perlu ditangani agar tidak kehilangan judul.
- Pemeriksaan langsung di preview belum berhasil karena halaman menampilkan pesan “Aplikasi sedang dimuat ulang”; temuan awal di atas telah dikonfirmasi dari kode.

## Perubahan
1. **Periksa semua halaman dan tab dashboard**
   Cocokkan judul header dengan judul di dalam setiap panel pada Operasional, SPK, Pelanggan, Marketing, Keuangan, Laporan, Pengaturan, dan Pusat Kontrol. Bedakan judul utama yang berulang dari judul bagian yang memang diperlukan.

2. **Pertahankan satu judul utama**
   Gunakan judul header dashboard sebagai judul utama untuk halaman biasa. Hilangkan judul panel yang mengulang makna yang sama, termasuk pengulangan dengan nama sedikit berbeda seperti Configuration dan SPK Configuration.
   Untuk halaman detail dengan nama khusus, gunakan nama detail sebagai satu judul utama, bukan menambahkan judul umum di atasnya.

3. **Rapikan ruang yang ditinggalkan**
   Sesuaikan jarak atas dan susunan deskripsi, ikon, badge, serta tombol setelah judul berulang dihapus. Pertahankan informasi penting dan seluruh tombol tindakan; jangan meninggalkan header atau kotak kosong.

4. **Pertahankan navigasi dan judul bagian**
   Label tab atas, breadcrumb, menu, judul tabel, dan judul bagian seperti Pengaturan Slider atau Daftar Banner tetap ada karena bukan judul utama halaman.

## Detail teknis
- Atur kepemilikan judul secara eksplisit antara `AdminLayout`, definisi halaman di `src/pages/Admin.tsx`, dan panel terkait; jangan menyembunyikan judul secara massal melalui CSS atau pencocokan teks.
- Pastikan satu heading utama tetap tersedia meskipun halaman tidak memiliki deskripsi. Tangani halaman detail secara eksplisit agar tidak mendapat heading umum tambahan.
- Periksa pemakaian ulang panel sebelum menghapus judul; bila panel juga tampil mandiri, sediakan pilihan menampilkan judul untuk konteks tersebut.
- Perubahan hanya pada tampilan. Tidak ada perubahan aturan SPK, penyimpanan, akses pengguna, atau database.
- Catat standar kepemilikan judul pada panduan proyek agar halaman berikutnya tidak mengulang pola ini.

## Verifikasi
- Periksa seluruh halaman dashboard yang tersedia bagi akun pengujian, termasuk tab turunannya; halaman dengan akses lain diperiksa dari kode dan dicatat bila belum dapat diuji langsung.
- Pastikan tiap halaman memiliki satu judul utama, tombol tetap berfungsi, dan judul bagian tetap terlihat.
- Periksa tampilan layar besar dan HP agar judul panjang serta tombol tidak bertumpuk atau terpotong.
- Uji halaman konfigurasi SPK yang Anda tandai sebagai contoh utama, lalu panel-panel lain dengan duplikasi terkonfirmasi.
- Bila preview masih gagal terbuka, selesaikan diagnosis yang diperlukan sebelum menyatakan pemeriksaan tampilan berhasil.