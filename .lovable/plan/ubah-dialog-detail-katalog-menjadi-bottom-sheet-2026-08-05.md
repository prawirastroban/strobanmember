# Ubah Dialog Detail Katalog Menjadi Bottom Sheet

## Tujuan
Saat pengguna menekan item katalog (layanan atau ban), detailnya muncul sebagai panel geser dari bawah layar, bukan modal di tengah. Tepi atas panel dibuat membulat agar terasa seperti sheet iOS/native, tidak tajam.

## Lingkup
- Detail layanan (`infoService`) di `src/pages/Katalog.tsx`.
- Detail ban (`tireDetail`) di `src/pages/Katalog.tsx`.
- Tidak mengubah data, API, logika keranjang, atau alur booking.

## Perubahan yang akan dilakukan

1. Ganti komponen `Dialog` + `DialogContent` menjadi `Sheet` + `SheetContent` dari `src/components/ui/sheet.tsx` untuk kedua dialog detail.
2. Gunakan varian `side="bottom"` yang sudah memiliki:
   - `rounded-t-3xl` (tepi atas membulat)
   - `max-h-[85dvh]` (tinggi fleksibel mengikuti layar)
   - Animasi slide-in dari bawah
   - Handle tarik (`.sheet-drag-handle`) yang sudah tersedia
3. Ganti `DialogHeader/DialogTitle/DialogDescription` dengan `SheetHeader/SheetTitle/SheetDescription` agar aksesibilitas tetap benar.
4. Pastikan isi sheet tetap bisa di-scroll:
   - Area deskripsi tetap memakai `ScrollHintColumn`.
   - Footer tombol tetap sticky di dalam sheet.
5. Sesuaikan lebar di layar besar: tetap anchored bottom, namun dibatasi `sm:max-w-md` dan dipusatkan agar tidak melebar penuh di desktop.
6. Hapus class animasi `animate-scale-in` milik Dialog karena Sheet sudah punya animasi bawaan.
7. Verifikasi di preview mobile bahwa:
   - Panel muncul dari bawah.
   - Tepi atas membulat.
   - Bisa ditutup dengan tombol X, tap overlay, atau geser ke bawah.

## Technical details
- File target: `src/pages/Katalog.tsx`.
- Komponen yang digunakan: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` dari `src/components/ui/sheet.tsx`.
- Varian: `side="bottom"`.
- Class tambahan pada `SheetContent`: `sm:max-w-md sm:rounded-t-3xl sm:left-1/2 sm:-translate-x-1/2` agar rapi di desktop.
- Tidak ada perubahan database, API, workflow, atau state management.
