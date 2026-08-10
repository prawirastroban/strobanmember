# Kotak Thumbnail Kartu Katalog Mengikuti Rasio

## Temuan
Di `src/pages/Katalog.tsx` (baris 372), kotak media kartu dipaksa `w-24 sm:w-28` + `self-stretch min-h-[104px]` — tingginya mengikuti tinggi kartu, bukan setelan rasio. Jadi walau setelan thumbnail dipilih 1:1, kotaknya tetap tampil memanjang/persegi panjang.

## Perubahan
1. Saat layanan punya `thumbnail_url`, kotak media memakai `aspect-ratio` dari setelan (1:1, 4:3, atau 3:4) dan tidak lagi `self-stretch`, sehingga tinggi = lebar untuk 1:1.
2. Kotak diposisikan rata atas (`self-start`) agar sejajar dengan judul kartu, lebar tetap `w-24 sm:w-28`.
3. Bila tidak ada `thumbnail_url` (fallback slideshow), perilaku lama dipertahankan (`self-stretch min-h-[104px]`) supaya kartu lain tidak berubah.
4. `ServiceThumbnail` dipanggil apa adanya; rasio diterapkan di wadah kartu memakai helper `ratioToNumber` dari `src/lib/serviceThumbnail.ts`.

## Verifikasi
Screenshot `/katalog` di lebar mobile untuk memastikan thumbnail Paket Servis Bronze tampil persegi (1:1).
