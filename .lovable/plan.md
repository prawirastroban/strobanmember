## Tujuan
Merapikan homepage mobile: hapus blok "Konsultasi Online" duplikat, jadikan Keluhan tab utama, dan hapus section Lokasi Cabang dari beranda.

## Perubahan

**1. Hapus "Konsultasi Online" di bawah kartu Booking/Keluhan**
- `src/pages/Index.tsx`: hapus render `<PopularServices />` (komponen ini merender section `#konsultasi` "Konsultasi Online") beserta importnya.
- Komponen `PopularServices.tsx` tetap ada karena `Konsultasi` masih dipakai secara embedded di kartu hero.

**2. Keluhan jadi tab default**
- `src/components/mobile/home/HeroBookingForm.tsx`: ubah state awal `heroMode` dari `"booking"` menjadi `"complaint"`, dan urutkan tab menjadi Keluhan | Booking (indikator geser disesuaikan agar posisi awal benar).

**3. Hapus Lokasi Cabang di beranda**
- `src/pages/Index.tsx`: hapus render `<BranchLocations />` dan importnya. Halaman `/cabang` tetap utuh.

## Catatan teknis
- Tidak ada perubahan logika bisnis, data, atau backend — hanya presentasi.
- Link internal `#cabang`/`#konsultasi` di beranda (jika ada) akan dicek agar tidak mengarah ke section yang sudah dihapus.
