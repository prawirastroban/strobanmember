## Tujuan
Tambahkan fitur **drag-to-reorder** (geser ke atas / bawah) untuk daftar layanan di `/dashboard/marketing/services`, dan pastikan urutan baru langsung tersinkronisasi ke seluruh tampilan publik (katalog web, mobile, booking flow).

## Mengapa cukup mengubah `sort_order`
Seluruh konsumer daftar layanan sudah membaca dari kolom `services.sort_order` (`ASC`):
- `ServiceManager` (dashboard)
- `ServiceCatalog` (landing web)
- `useBookingServices` (Booking desktop + `MobileBookingWizard`)
- `MobileServiceList` & komponen mobile home

Jadi begitu `sort_order` di DB diperbarui, semua tampilan ikut berubah otomatis (sebagian bahkan via Realtime). Tidak perlu kolom baru atau migrasi.

## Rencana implementasi

1. **Tambah library drag-and-drop**
   - Pasang `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (ringan, aksesibel, mendukung keyboard, sudah jadi standar di proyek React modern).

2. **Refactor list di `src/components/admin/ServiceManager.tsx`**
   - Bungkus list desktop (`<TableBody>`) dan list mobile (`<div className="flex flex-col gap-2">`) dengan `DndContext` + `SortableContext` (strategi `verticalListSortingStrategy`).
   - Buat sub-komponen `SortableServiceRow` (desktop) dan `SortableServiceCard` (mobile) yang memakai `useSortable`.
   - Drag handle:
     - Desktop: ikon `GripVertical` di kolom `#` yang sudah ada — jadikan handle aktif (cursor-grab, `{...listeners}`).
     - Mobile: tambahkan ikon `GripVertical` kecil di pojok kiri atas card sebagai handle (tap-and-hold untuk geser di touch device, via `PointerSensor` dengan `activationConstraint: { delay: 150, tolerance: 5 }`).
   - Sensor: `PointerSensor` + `KeyboardSensor` (aksesibilitas keyboard).

3. **Persistensi urutan ke database**
   - Saat `onDragEnd`, hitung array baru via `arrayMove`, update state lokal optimistik agar UI mulus.
   - Kirim batch update ke Supabase: untuk setiap baris yang `sort_order`-nya berubah, jalankan `update services set sort_order = <newIndex+1> where id = <id>`. Pakai `Promise.all` agar paralel.
   - Jika gagal, rollback state dan tampilkan toast error. Jika sukses, toast singkat "Urutan diperbarui".
   - Tidak perlu migrasi DB — kolom `sort_order` sudah ada dan sudah jadi sumber urutan untuk semua konsumer.

4. **Sinkronisasi realtime ke tampilan publik**
   - `useBookingServices` sudah subscribe perubahan `services` via Realtime → otomatis re-fetch.
   - `ServiceCatalog` di landing fetch sekali saat mount; cukup. Refresh halaman akan menampilkan urutan baru. (Opsional kecil: tidak diubah agar tetap fokus pada permintaan user.)

5. **UX kecil**
   - Saat drag, baris yang sedang dipindah pakai `opacity-50` + shadow ringan agar jelas.
   - Drop zone highlight subtle pakai token `bg-primary/5`.
   - Field "Sort Order" manual di dialog Edit dipertahankan (tidak dihapus) — drag adalah cara cepat, input numerik tetap tersedia untuk power user.

## File yang disentuh
- `src/components/admin/ServiceManager.tsx` (UI list + handler reorder)
- `package.json` (tambah 3 dependency `@dnd-kit/*`)

Tidak ada perubahan database, edge function, atau file publik lain.

## Hasil
- Admin bisa menggeser layanan ke atas/bawah langsung di `/dashboard/marketing/services` (desktop drag dengan ikon grip, mobile tap-hold).
- Urutan baru langsung tersimpan ke `services.sort_order` dan otomatis tercermin di katalog web, mobile, dan halaman booking — tanpa publish ulang.
