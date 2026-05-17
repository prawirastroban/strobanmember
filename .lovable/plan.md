## Masalah
Dot indikator pada slideshow katalog servis (`ServiceMediaSlideshow`) tampak kebesaran — terutama dot aktif (`w-4 h-1.5`) yang terlihat seperti pill putih besar menutup gambar.

## Perbaikan
File: `src/components/catalog/ServiceMediaSlideshow.tsx`

- Perkecil ukuran dot dan posisikan lebih rapat ke bawah:
  - Container: `bottom-1.5` → `bottom-1`, `gap-1` → `gap-0.5`
  - Dot tidak aktif: `h-1.5 w-1.5` → `h-1 w-1`
  - Dot aktif: `w-4 h-1.5` → `w-2.5 h-1`
- Tambahkan sedikit drop shadow halus agar tetap kebaca di gambar terang tanpa harus besar.

Tidak ada perubahan logika atau file lain.
