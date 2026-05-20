## Masalah
Pada versi mobile, indikator titik (dots) slideshow di kartu Katalog tampil sebagai **pill putih raksasa** yang menutupi gambar, bukan titik kecil rapi seperti seharusnya.

## Akar penyebab
`src/index.css` baris 190-194 memiliki aturan global untuk perangkat sentuh:

```css
@media (hover: none) and (pointer: coarse) {
  button, a[role="button"], [role="tab"] {
    min-height: 40px;
  }
}
```

Aturan ini memaksa **semua** `<button>` di mobile setinggi minimal 40px untuk tap-target. Tombol dot di `ServiceMediaSlideshow.tsx` (baris 113) yang seharusnya `h-1` (4px) ikut terdorong jadi 40px, sehingga muncul sebagai pill putih besar di tengah card.

Komponen lain dengan dot-button serupa tidak ditemukan, jadi bug ini eksklusif ke slideshow katalog.

## Rencana perbaikan
1. **Override min-height untuk dot slideshow** di `src/components/catalog/ServiceMediaSlideshow.tsx`:
   - Tambahkan utility `!min-h-0` (penting agar override aturan global touch device) pada tombol dot.
   - Bungkus dot dalam wrapper tap-target yang tetap nyaman disentuh (area klik tersembunyi ~24px) tanpa membesarkan tampilan visual titiknya. Pakai pola: `<button>` ukuran sentuh transparan, dot visual di dalam sebagai `<span>`.

2. **Pastikan simetris di semua viewport** — dots tetap kecil (h-1, w-1 / w-2.5 saat aktif), warna putih dengan shadow tipis seperti sekarang.

3. **Verifikasi** dengan screenshot mobile preview pada halaman `/katalog` setelah fix, memastikan tidak ada lagi pill putih raksasa di card lain.

## Detail teknis
- File diubah: `src/components/catalog/ServiceMediaSlideshow.tsx` (hanya bagian dots, baris 110-127).
- Tidak menyentuh `index.css` global agar tap-target 40px tetap berlaku untuk seluruh tombol lain di app (tetap aksesibel).
- Pendekatan: wrapper button transparan `p-1.5 !min-h-0` + dot visual `<span>` di dalamnya — area sentuh ~16-20px, visual tetap 4px.

## Hasil yang diharapkan
- Di mobile, indikator slideshow kembali tampil sebagai titik-titik kecil rapi di bagian bawah kartu — sama persis seperti versi desktop, tidak ada lagi pill putih besar yang menutupi gambar.
- Tap area dot tetap nyaman disentuh.