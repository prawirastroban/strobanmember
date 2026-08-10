# Audit & Perbaikan Tampilan Android (Tombol Terpotong)

## Temuan (terverifikasi di kode)

1. **Penyebab utama tombol "Lanjut ke Pembayaran" terpotong**
   `SheetContent side="bottom"` sudah punya padding aman `pb-[max(1rem,env(safe-area-inset-bottom))]` (`src/components/ui/sheet.tsx:38`). Namun beberapa sheet mengirim `p-0` lewat `className`, dan penggabungan kelas Tailwind membuat `p-0` menang sehingga padding aman itu hilang. Akibatnya di Android footer sheet berada tepat di bawah tombol navigasi sistem.
   Terdampak: `src/components/cart/CartSheetDialog.tsx:99`, `src/pages/Katalog.tsx:537` & `:684`, `src/components/mobile/home/HeroBookingForm.tsx:330, 474, 563`.

2. **Drawer belum punya area aman**
   `src/components/ui/drawer.tsx:34` (bottom drawer) tidak memakai `env(safe-area-inset-bottom)` sama sekali.

3. **Bilah aksi melayang di halaman SPK tanpa area aman**
   `SPKNewForm.tsx:1442`, `SPKCustomerApprove.tsx:422`, `SPKCanvas.tsx:657` memakai `fixed bottom-0` tanpa `safe-area-bottom` (berbeda dengan `Booking.tsx` dan `MobileBookingWizard.tsx` yang sudah benar).

## Perubahan

1. Pindahkan padding bawah aman dari `p-6/pb-...` ke **elemen pembungkus internal** sheet bawah: tetapkan pada `SheetContent` sebuah `paddingBottom` via style/kelas yang tidak bisa ditimpa `p-0` (mis. `style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}` untuk `side="bottom"`), sehingga semua sheet aman tanpa harus mengubah tiap pemanggil.
2. Untuk sheet yang punya footer tombol sendiri (Keranjang Servis, detail katalog), pastikan blok footer memakai `pb-[max(0.75rem,env(safe-area-inset-bottom))]` agar tombol tidak menempel di tepi.
3. Tambahkan `pb-[env(safe-area-inset-bottom)]` pada `DrawerContent`.
4. Tambahkan kelas `safe-area-bottom` pada tiga bilah aksi tetap di halaman SPK.
5. Audit visual di lebar 393px: keranjang servis, sheet detail katalog, sheet konsultasi/jadwal HeroBookingForm, halaman SPK — pastikan tidak ada tombol yang tertutup atau terpotong.

## Catatan
Murni perubahan tampilan/layout; tidak ada perubahan data, logika keranjang, atau alur booking.
