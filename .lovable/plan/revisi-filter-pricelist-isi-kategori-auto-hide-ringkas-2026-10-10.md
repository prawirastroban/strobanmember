# Revisi Filter Pricelist: Isi Kategori Auto-Hide (Ringkas)

## Masalah
Perubahan sebelumnya menyembunyikan **seluruh panel filter** saat scroll — itu salah. Yang diinginkan: panel filter tetap tampil, tetapi **isi tiap kategori filter (Brand, Type, Pattern, Rim, Satuan) tertutup otomatis** agar tampilan ringkas seperti gambar referensi (semua kategori tampil sebagai baris judul dengan tanda `>`, isi hanya muncul saat judul diklik).

## Perubahan (hanya `src/pages/Pricelist.tsx`)

1. **Hapus behavior autohide panel saat scroll**
   - Hapus hook `useAutoHideOnScroll` dan pemakaian `filterHidden` di panel filter, sehingga panel filter selalu terlihat dan tetap sticky sejajar search bar seperti sebelumnya.

2. **Isi kategori filter tertutup secara default**
   - Ubah state `collapsed` menjadi default **tertutup untuk semua grup** (Brand, Type, Pattern, Rim, Satuan), sehingga saat halaman dibuka tampilannya persis seperti gambar: daftar judul ringkas dengan tanda `>`.
   - Judul tetap bisa diklik untuk buka/tutup (tanda `>` berputar jadi `v` saat terbuka) — mekanisme yang sudah ada dipertahankan.

3. **Kategori dengan pilihan aktif tetap terbuka**
   - Jika user memilih nilai di suatu kategori (misal memilih brand "GT Radial"), kategori itu otomatis **terbuka** agar pilihan terlihat; kategori lain tetap tertutup. Badge angka jumlah pilihan tetap tampil di kanan judul.

4. **Reset saat ganti kategori**
   - Saat pindah tab Ban/Oli/Sparepart, semua grup kembali tertutup (sudah ada `setCollapsed({})`, disesuaikan dengan default baru).

## Verifikasi
- Build/typecheck bersih.
- Playwright di localhost:8080 (sesi staff terinjeksi): buka `/pricelist`, pastikan semua grup filter tertutup seperti gambar; klik "Type" → isi terbuka; pilih nilai → badge muncul; scroll ke bawah → panel filter tetap tampil (tidak menghilang); cek tampilan mobile (sheet filter) juga ringkas.
