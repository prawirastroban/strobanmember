## Masalah

Tombol **Lihat SPK** pada kartu Analisis Kesehatan AI membuka `/spk/:id/track` dan halaman menampilkan **"Link Tidak Valid"**.

Penyebab sudah dipastikan lewat query database (bukan dugaan):

- SPK yang laporan AI-nya tampil di akun pelanggan — `SPK/TASI5270/202607/0001`, `/0002`, `/0004` — semuanya sudah **dihapus (soft delete)**: kolom `deleted_at` terisi.
- Fungsi publik `get_public_spk` sengaja menyaring `deleted_at IS NULL`, jadi mengembalikan kosong → tracker menampilkan "Link Tidak Valid".
- Hook `useVehicleHealthReports` mengambil SPK **tanpa** menyaring `deleted_at`, sehingga laporan AI dari SPK yang sudah dihapus tetap muncul di Riwayat, Pengingat, Kendaraan Saya, dan Detail Kendaraan.

Jadi bukan tombolnya yang salah — datanya yang seharusnya tidak ditampilkan.

## Yang akan diperbaiki

1. **Sembunyikan SPK terhapus dari laporan kesehatan AI**
   `src/hooks/useVehicleHealthReports.ts`: tambahkan filter `deleted_at is null` pada query. Efeknya, kartu AI hanya menampilkan SPK yang benar-benar masih aktif, sehingga tombol Lihat SPK selalu mengarah ke halaman yang valid.

2. **Tampilkan kartu AI hanya untuk SPK yang sudah selesai**
   Ikut menyaring status `closed` agar pelanggan tidak melihat analisis dari pekerjaan yang belum selesai (SPK `/0004` berstatus masih dikerjakan tapi punya laporan AI). Ini menjaga makna "hasil analisis setelah servis selesai".

3. **Jaring pengaman di halaman tracker**
   `src/pages/spk/SPKPublicTracker.tsx`: saat SPK tidak ditemukan, pesan diperjelas menjadi informasi bahwa data servis sudah tidak tersedia/dihapus, plus tombol kembali ke halaman sebelumnya — bukan hanya "Link Tidak Valid" yang membingungkan.

## Catatan teknis

- Perubahan murni di sisi tampilan/query klien. Tidak ada perubahan database, RPC, RLS, atau alur kerja SPK.
- Setelah perbaikan, akun Prawira kemungkinan besar hanya menampilkan laporan AI dari SPK aktif yang berstatus selesai (`SPK/TASI5270/202607/0006`). Bila hasilnya jadi kosong untuk salah satu kendaraan, tampilan otomatis memakai kartu "Belum ada analisis kesehatan AI".
- Verifikasi dilakukan dengan sesi login Anda: buka Detail Kendaraan → klik **Lihat SPK** → memastikan halaman live tracking terbuka normal.
