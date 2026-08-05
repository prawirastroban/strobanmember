# Perbaikan Bottom Sheet Katalog: Hilangkan Tombol X & Perbaiki Footer Tombol

## Tujuan
Memperbaiki tampilan bottom sheet detail layanan/ban di `/katalog`:
1. Menghilangkan tombol close (X) di pojok kanan atas bottom sheet.
2. Memperbaiki layout footer agar tombol **Tambah** dan **Booking** tidak terpotong di layar mobile.

## Masalah yang Diamati
- Tombol X masih tampil di pojok kanan atas `SheetContent`.
- Footer sticky dengan tombol **Tambah** / **Booking** berada di dalam container `overflow-y-auto`, sehingga di beberapa perangkat mobile bagian bawah bisa terpotong atau tertutup safe-area.

## Perubahan yang Akan Dilakukan

### 1. Sembunyikan Tombol X (`SheetContent`)
- Pada `src/pages/Katalog.tsx`, tambahkan prop `hideClose` pada komponen `<SheetContent>` untuk:
  - Sheet detail layanan (baris ~492).
  - Sheet detail ban (baris ~637) — agar konsisten.
- Pengguna tetap bisa menutup sheet dengan swipe-down atau tap di luar sheet.

### 2. Perbaiki Struktur Footer Bottom Sheet
- Ubah layout inner sheet dari `flex flex-col h-full max-h-full overflow-y-auto` menjadi struktur flex yang memisahkan konten scrollable dan footer sticky.
- Pindahkan footer tombol **Tambah** / **Booking** keluar dari container scrollable, atau pastikan footer sticky memiliki:
  - `flex-shrink-0`
  - Padding bottom yang memadai (`env(safe-area-inset-bottom)`).
  - Tidak tertimpa oleh drag handle atau content scroll.
- Pastikan `SheetContent` menggunakan `h-auto max-h-[85dvh]` (sudah ada di `sheetVariants`) dan inner wrapper memakai `flex flex-col h-full`.

### 3. Verifikasi Visual
- Cek ulang tampilan mobile (viewport ~393×852) untuk memastikan:
  - Tombol X tidak muncul.
  - Tombol **Tambah** dan **Booking** tampil seluruhnya, tidak terpotong.
  - Sheet tetap bisa ditutup dengan swipe-down.

## File yang Terlibat
- `src/pages/Katalog.tsx`
- `src/components/ui/sheet.tsx` (hanya untuk referensi, tidak diubah logika swipe)

## Tidak Berubah
- Logika bisnis cart, booking, atau data layanan.
- Database, API, workflow, atau fitur lain.
