## Masalah
Pada pop-up **Preview SPK** (`SPKViewDialog`) muncul dua tombol **X** di pojok kanan atas: satu bawaan `DialogContent` (Radix) dan satu manual yang ditambahkan di header kustom. Tampak seperti "double X".

## Perbaikan
Hapus tombol X manual pada header `SPKViewDialog` dan andalkan tombol close bawaan dialog.

### File
- `src/components/spk/SPKViewDialog.tsx`
  - Hapus `<button>` dengan ikon `<X />` di header.
  - Hapus import `X` dari `lucide-react` (tidak lagi terpakai).
  - Sesuaikan padding kanan header supaya judul tidak tertumpuk dengan tombol close bawaan (mis. tambah `pr-10` pada container header).

### Hasil
Hanya ada satu tombol tutup (X bawaan Radix) di pojok kanan atas dialog preview SPK; layout header tetap rapi.
