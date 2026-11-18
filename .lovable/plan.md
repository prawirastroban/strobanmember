# Atur urutan kategori Katalog dari "Kelola Kategori"

## Yang akan dibuat
- Di dialog **Kelola Kategori**, setiap baris diberi tombol panah naik/turun (dan pegangan seret di layar besar). Baris paling atas = kategori paling kiri di Katalog.
- Urutan disimpan otomatis begitu diubah, lalu muncul notifikasi "Urutan disimpan".
- Di halaman **Katalog**, deretan tombol kategori (setelah "Semua") mengikuti urutan itu. Kategori yang dimatikan tetap tidak tampil.
- Ban tetap memakai filter khusus seperti sekarang.

## Yang tidak diubah
Tampilan dialog lain (tambah, ubah nama, jenis, aktif/nonaktif, hapus), layout Katalog, dan urutan layanan di dalam kategori.

## Detail teknis
- `service_categories.sort_order` sudah tersedia; tidak perlu migrasi.
- `ServiceManager.tsx`: tombol naik/turun pada daftar kategori, tulis ulang `sort_order` (1..n) hanya untuk baris yang berubah, mirip `persistReorder` layanan.
- `Katalog.tsx`: ambil kategori aktif berurutan dari `service_categories` (via `useServiceCategories`), urutkan daftar `categories` menurut itu; kategori tanpa entri ditaruh di akhir.
- Estimasi: 1 kredit.
