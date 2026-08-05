# Revisi Popup Keranjang: Muncul dari Bawah

## Tujuan
Mengubah popup "Keranjang Servis" yang saat ini muncul di tengah layar menjadi **bottom sheet** yang muncul dari bawah, sesuai mockup mobile yang diunggah.

## Perubahan yang Dilakukan
1. **Ganti container popup** di `src/components/cart/CartSheetDialog.tsx`:
   - Hapus penggunaan `Dialog` + `DialogContent` dari `@/components/ui/dialog`.
   - Gunakan `Sheet`, `SheetContent`, `SheetTitle` dari `@/components/ui/sheet` dengan prop `side="bottom"`.
2. **Pertahankan seluruh konten dan perilaku yang sudah ada**:
   - Header ikon keranjang + judul + tombol tutup.
   - Daftar item dengan pengatur jumlah `−  1  +`.
   - Toast "Urungkan" saat item dihapus.
   - Pengelompokan "Layanan" / "Produk".
   - Ringkasan total pembayaran dan tombol "Lanjut ke Pembayaran".
   - Keadaan kosong dengan tombol "Lihat Katalog".
3. **Sesuaikan styling** agar pas sebagai bottom sheet:
   - Hapus `rounded-3xl` di bagian atas bila tidak diperlukan, atau pertahankan rounded atas (`rounded-t-3xl`) agar mengikuti mockup.
   - Pastikan tinggi maksimal tidak memenuhi seluruh layar (`max-h-[85vh]` atau serupa) dan area scroll tetap berfungsi.
   - Pertahankan glassmorphism dan warna tema yang sudah ada.
4. **Verifikasi**:
   - Build TypeScript berhasil.
   - Preview mobile: popup muncul dari bawah, bisa ditutup via tombol tutup, tap overlay, dan swipe-down (Sheet sudah mendukung swipe-to-close).
   - Tombol "Lanjut ke Pembayaran" tetap mengarahkan ke `/booking?cart=1`.
