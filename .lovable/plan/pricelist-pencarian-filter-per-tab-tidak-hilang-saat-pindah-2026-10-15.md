# Pricelist: pencarian & filter per tab tidak hilang saat pindah tab

## Masalah
Saat pengguna mencari di tab Ban lalu pindah ke Oli dan kembali ke Ban, pencarian terakhir hilang. Penyebabnya sudah dikonfirmasi di `src/pages/Pricelist.tsx`: setiap kali tab diganti, kode masih menjalankan `setQ("")`, `setFilters(EMPTY)`, `setOpenMap({})`, `setLimit(PAGE)` — jadi ingatan milik tab tujuan langsung tertimpa kosong sebelum sempat dipakai.

## Perbaikan
- Hapus pengosongan pencarian/filter/grup/batas baris di semua tempat ganti tab (3 lokasi: bar kategori desktop, tombol kategori di panel filter, dan pop-up filter HP).
- Setelah pindah tab, yang terjadi hanya: tab berganti dan halaman scroll ke atas; pencarian, filter, dan posisi milik tab itu dimuat dari ingatan masing-masing tab.
- Tombol x di search bar dan tombol Reset di filter tetap bekerja untuk menghapus secara manual.

## Hal yang tetap
- Ingatan saat refresh / pindah aplikasi lalu kembali (localStorage per akun) tetap berfungsi seperti sekarang.
- Tidak ada perubahan tampilan, data, atau fitur lain.

## Verifikasi
- Playwright: ketik pencarian + pilih filter di Ban → pindah ke Oli → kembali ke Ban → pencarian & filter Ban masih ada; ulangi antar beberapa tab; cek juga di tampilan HP.
