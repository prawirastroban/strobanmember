# Hilangkan Informasi Versi Aplikasi di Halaman Akun

## Tujuan
Menghapus badge/info versi aplikasi di halaman `/profile` agar jarak antara tombol **Logout** dan tombol navigasi **Home** lebih rapat.

## Perubahan yang Dilakukan
1. **Hapus penggunaan komponen `AppVersionBadge`** di `src/pages/Profile.tsx` (baris 346, `variant="card"`).
2. **Hapus import `AppVersionBadge`** yang tidak lagi digunakan di `src/pages/Profile.tsx`.

## Catatan
- Komponen `AppVersionBadge` tetap dipertahankan karena masih digunakan di `src/components/admin/AdminLayout.tsx` dengan `variant="inline"`.
- Tidak ada perubahan logika bisnis, database, atau API.
- Setelah perubahan, jarak vertikal di bagian bawah halaman profil akan berkurang karena card versi aplikasi dihilangkan.
