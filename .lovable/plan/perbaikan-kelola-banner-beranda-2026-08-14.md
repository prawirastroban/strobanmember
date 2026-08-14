# Perbaikan Kelola Banner Beranda

## Masalah

Halaman Banner bisa dibuka oleh Admin dan Staff, tetapi aturan akses database untuk tabel banner hanya mengizinkan peran **Admin**. Akibatnya untuk Staff:

- Tambah banner gagal (unggah gambar berhasil, penyimpanan datanya ditolak)
- Simpan perubahan judul/urutan/status gagal
- Hapus banner gagal
- Banner nonaktif tidak terlihat di daftar admin (hanya banner aktif yang bisa dibaca)

## Perbaikan

1. **Akses database**: samakan hak kelola banner dengan pengaturan aplikasi lain — Admin + Staff boleh menambah, mengubah, dan menghapus banner; publik tetap hanya melihat banner aktif; Admin dan Staff bisa melihat semua banner termasuk yang nonaktif.
2. **Pesan error lebih jelas** di panel banner: bila akses ditolak, tampilkan pesan "Akun Anda tidak punya izin mengubah banner" alih-alih pesan teknis.
3. **Tampilan beranda ikut berubah**: slider beranda saat ini hanya membaca data sekali saat halaman dibuka. Ditambahkan pembacaan ulang otomatis saat halaman kembali aktif (fokus/kembali dari tab lain) sehingga perubahan banner langsung terlihat tanpa perlu reinstal/clear cache.
4. **Verifikasi**: uji tambah, ubah judul/urutan/aktif, dan hapus dari panel; lalu cek beranda menampilkan hasilnya.

## Catatan teknis

- Migrasi: ganti policy `home_banners` (INSERT/UPDATE/DELETE) menjadi `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff')`, dan policy SELECT menjadi `is_active = true OR admin OR staff`. Grant tabel sudah sesuai.
- `src/components/admin/HomeBannerManager.tsx`: mapping error 42501/"row-level security" ke pesan ramah; hapus file storage terkait saat banner dihapus (opsional, aman).
- `src/hooks/useHomeBanners.ts`: ekstrak fetch ke fungsi, tambahkan listener `visibilitychange`/`focus` untuk refetch. Tidak ada perubahan alur lain.
