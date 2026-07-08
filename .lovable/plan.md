# Rencana: Layout Fleksibel untuk Tab "Versi Aplikasi"

Hanya mengubah **ukuran/lebar & responsivitas grid**. Tidak mengubah konten, warna, logika, atau komponen.

## File yang diubah
- `src/components/admin/AppVersionManager.tsx`

## Perubahan Ukuran

1. **Container utama** (line 208)
   - Sebelum: `className="space-y-4 max-w-3xl"` — dibatasi ~768px sehingga tampak sempit di layar besar.
   - Sesudah: `className="space-y-4 w-full"` — mengisi lebar penuh area konten (tab sudah punya padding sendiri).

2. **Grid "Version Registry"** (line 221)
   - Sebelum: `grid grid-cols-2 md:grid-cols-3 gap-3`
   - Sesudah: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
   - Layar kecil 1 kolom (tidak mepet), sedang 2, besar 3.

3. **Grid "Kontrol Versi Aplikasi"** (line 312)
   - Sebelum: `grid grid-cols-2 md:grid-cols-4 gap-3`
   - Sesudah: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`

4. **Grid "Versi Terbaru / Minimum Didukung"** (line 382)
   - Sebelum: `grid grid-cols-1 md:grid-cols-2 gap-3`
   - Sesudah: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3` (tetap 2 kolom di layar sedang+, tidak berubah — hanya menjaga konsistensi; boleh tidak diubah)

## Yang TIDAK diubah
- Semua teks, ikon, warna, badge, urutan, dan logika komponen.
- Tidak menyentuh `SystemManagementHub.tsx` atau file lain.

## Hasil yang diharapkan
Panel Version Registry & Kontrol Versi Aplikasi mengisi lebar layar (tidak lagi terkunci ~768px), dan kartu-kartunya menyesuaikan jumlah kolom sesuai ukuran layar (1 / 2 / 3–4 kolom).
