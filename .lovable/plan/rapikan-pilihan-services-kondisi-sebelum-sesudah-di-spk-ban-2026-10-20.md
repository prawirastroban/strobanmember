# Rapikan pilihan Services & kondisi Sebelum/Sesudah di SPK Ban

Pada pratinjau dan PDF SPK Ban, tombol bulat (Baik/Kurang, Baik/Tidak Rata, Normal/Bengkok) tidak lurus ke bawah karena panjang tulisannya berbeda. Pilihan Services di baris atas juga jaraknya tidak sama.

## Perubahan
- Kondisi Sebelum dan Sesudah: pilihan pertama dan kedua di tiap baris dibuat dalam kolom yang lebarnya sama. Hasilnya, semua bulatan pertama lurus ke bawah, begitu juga bulatan kedua, dan semuanya rata kiri di kolomnya.
- Baris Services (Ganti Ban, Spooring, Balancing, Nitrogen, Rotasi, Pengecekan): dibagi menjadi 6 kolom yang lebarnya sama, dan isinya rata kiri.
- Isi, warna, dan data tidak berubah. SPK Service tidak ikut berubah.

## Detail teknis
- `BanPrintSheet.tsx` `CondTable`: ganti `flex gap-3` dengan `grid grid-cols-[64px_72px]` (opsi rata kiri). Label tetap di kiri.
- Baris Services: ganti `flex flex-wrap justify-around` dengan `grid grid-cols-6`.
- Periksa lewat screenshot Playwright pratinjau SPK Ban.
