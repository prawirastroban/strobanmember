# Bilah kategori pricelist tidak terpotong di HP

## Masalah
Di HP asli (iPhone/Android), navigasi bawah aplikasi jadi lebih tinggi karena ada area aman di bawah layar (garis home iPhone/tombol Android). Bilah Ban · Oli · Spareparts · Jasa posisinya tetap, sehingga separuhnya tertutup navigasi bawah.

## Perbaikan
- Bilah kategori dinaikkan otomatis setinggi navigasi bawah ditambah area aman perangkat, jadi selalu tampil utuh di atasnya di semua HP.
- Pesan kecil "segera hadir" di atas bilah ikut dinaikkan dengan cara yang sama.
- Daftar harga diberi ruang kosong di bawah supaya baris terakhir tidak tertutup bilah.
- Layar besar tidak berubah.

## Detail teknis
`src/pages/Pricelist.tsx`: ganti `bottom-20` pada nav dengan `bottom-[calc(5rem+env(safe-area-inset-bottom))]` (tetap `lg:bottom-6`), toast `bottom-36` → `bottom-[calc(9rem+env(safe-area-inset-bottom))]`, tambah padding bawah konten setara. Uji Playwright 393px.
