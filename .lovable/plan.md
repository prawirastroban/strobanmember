## Perbaikan: Email overflow di card Pelanggan (Rincian Booking)

### Penyebab
Pada `BookingsManager.tsx` baris 1506–1511, komponen `Row` memakai grid `[110px_1fr]` tetapi kolom value hanya punya `break-words`. Karena email tidak punya spasi, `break-words` tidak memaksa pemutusan, dan tanpa `min-w-0` kolom `1fr` menolak menyusut → teks email keluar batas card.

### Perubahan
Satu file, satu titik:

**`src/components/admin/BookingsManager.tsx`** — komponen `Row` di dalam dialog Rincian Booking:
- Tambahkan `min-w-0` pada container grid agar kolom value bisa menyusut
- Ganti `break-words` → `break-all` (atau tambah `overflow-wrap-anywhere`) pada div value supaya string tanpa spasi seperti email/URL ikut wrap

Hasil: email panjang membungkus ke baris berikutnya tetap di dalam card, layout kolom tidak berubah untuk value pendek.

### Yang tidak diubah
- Struktur Section/Row lain
- Lebar grid 110px
- Logika data atau styling card
