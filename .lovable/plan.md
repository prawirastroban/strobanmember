# Perbaiki Titik Indikator Banner yang Tampil Seperti Batang Panjang di HP

Pada layar HP, titik indikator slide banner beranda tampil sebagai batang vertikal tinggi di tengah banner (bukan titik kecil di bawah gambar). Penyebabnya sudah dipastikan: ada aturan global "tap target" untuk perangkat sentuh yang memaksa semua `<button>` setinggi minimal 40px, sehingga titik yang seharusnya 6px ikut memanjang jadi 40px dan tampak seperti bug.

## Yang akan diperbaiki

- Titik indikator banner kembali tampil kecil (titik bulat, dengan titik aktif berbentuk kapsul memanjang) dan tetap rapi menempel di bagian bawah gambar banner.
- Area sentuhnya tetap nyaman ditekan (tetap sekitar 40px), tapi bagian yang terlihat hanya titik kecil — jadi tetap ramah jari tanpa merusak tampilan.
- Perbaikan yang sama diterapkan pada indikator carousel lain yang punya masalah identik: carousel promo di beranda dan slideshow media di halaman katalog.
- Tampilan diverifikasi ulang dengan tangkapan layar mode HP (393px) setelah perbaikan.

## Detail teknis

- Tambah utilitas kecil di `src/index.css` (mis. `.tap-dot`) yang mengecualikan tombol indikator dari aturan `@media (hover:none) and (pointer:coarse) { button { min-height: 40px } }`, dengan pola: tombol jadi pembungkus transparan berukuran tap-target (padding vertikal) dan visual titik dipindah ke `<span>` di dalamnya.
- File yang disentuh: `src/index.css`, `src/components/mobile/home/HomeBannerSlider.tsx`, `src/components/mobile/PromoCarousel.tsx`, `src/components/catalog/ServiceMediaSlideshow.tsx`.
- Aturan tap-target global tetap dipertahankan untuk tombol lain; hanya indikator carousel yang dikecualikan. Tanpa perubahan logika, data, atau fitur.
