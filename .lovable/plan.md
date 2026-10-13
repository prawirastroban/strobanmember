# Bilah kategori pricelist dibuat lebih tipis

## Yang akan berubah

Bilah melayang di bawah berisi **Ban · Oli · Spareparts · Jasa** dibuat lebih ramping sehingga tidak memakan banyak tempat dan terasa lebih ringkas.

- Tinggi bilah turun sekitar sepertiga: dari sekitar 56px menjadi sekitar 38px.
- Jarak antar tombol dan jarak isi ke tepi bilah diperkecil, ikon dan teks tombol sedikit dikecilkan sehingga tetap terbaca.
- Tombol aktif tetap ditandai warna merah, posisi bilah (menempel di atas navigasi bawah di HP, di kanan-bawah pada layar besar) tidak berubah.
- Area sentuh tiap tombol tetap nyaman (tinggi minimal 30px), label tidak terpotong, dan bilah tidak melebar sampai keluar layar di HP.
- Bagian lain halaman (tabel, search bar, panel filter) tidak berubah.

## Detail teknis

Hanya di `src/pages/Pricelist.tsx`, blok bilah kategori (baris 292-304):

- Pembungkus `nav`: `gap-1` menjadi `gap-0.5`, `p-1.5` menjadi `p-1`.
- Tiap tombol: menambah `min-h-[30px]` (saat ini tertahan tinggi minimum 44px dari ukuran tombol bawaan, sehingga bilah terasa tebal), `py-2` menjadi `py-1`, `px-3 sm:px-4` menjadi `px-2.5 sm:px-3.5`, `gap-1.5` menjadi `gap-1`, `text-xs sm:text-sm` menjadi `text-[11px] sm:text-xs`.
- Ikon kategori: `h-4 w-4` menjadi `h-3.5 w-3.5`.
- Tidak ada perubahan data, aturan akses, maupun perilaku perpindahan tab.

## Pemeriksaan

- Ukur tinggi bilah sebelum dan sesudah (diperkirakan 56px menjadi sekitar 38px).
- Cek keempat tab: label Ban/Oli/Spareparts/Jasa tampil utuh, tombol aktif terlihat jelas, tidak ada teks terpotong.
- Cek HP 390px: bilah tetap muat tanpa melebar keluar layar, dan tidak menutupi lebih banyak baris tabel daripada sebelumnya.
