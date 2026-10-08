# Filter Lengkap — Dashboard SPK /dashboard/spk/all

## Keadaan saat ini
- Halaman `src/pages/spk/admin/SPKAllList.tsx` sudah memakai `FilterBarV2` dengan search (nomor SPK, nama, plat, cabang, telepon) dan chip status (Semua / Sedang Dikerjakan / Selesai / Dibatalkan / Draft).
- Belum ada filter **cabang**, **rentang tanggal**, **prioritas**, dan **mekanik** seperti yang tersedia di halaman Bookings.
- Data sudah dimuat lengkap di klien (pagination 1000/batch), jadi semua filter baru cukup dilakukan client-side tanpa query tambahan.

## Yang dibangun
Memperluas filter di SPKAllList agar setara dengan filter Bookings, tetap memakai `FilterBarV2` + sheet "Semua Filter" (`AdvancedFilterSheet`).

### Filter baru
- **Cabang** — dropdown dari `useScopedBranches()` (otomatis terkunci ke cabang sendiri untuk admin_cabang, sama seperti halaman lain).
- **Tanggal** — preset timeline (`timelineFilter.ts`: Hari Ini, Kemarin, Minggu Ini/Lalu, Bulan Ini/Lalu, Kuartal, Tahun, Custom dengan date picker), default **Bulan Ini**, memfilter berdasarkan tanggal pembuatan SPK (`created_at`).
- **Prioritas** — chip "Prioritas Tinggi".
- **Mekanik** — dropdown berisi daftar nama mekanik yang muncul di data (dinamis dari daftar yang dimuat).
- Search & chip status yang sudah ada tetap dipertahankan; tombol **Reset** mengembalikan semua ke default; jumlah hasil ("X hasil") tetap tampil.

### Perubahan teknis
- `SpkCard` ditambah field `created_at` (ISO) dan `branch_slug` agar filter tanggal & cabang bisa dicocokkan tanpa parsing ulang teks tampilan.
- State filter baru: `timeline`, `branch`, `priorityOnly`, `mechanic`; semua digabung di `useMemo` `filtered`.
- `AdvancedFilterSheet` dipakai untuk Cabang + Mekanik + Tanggal custom; chip cepat tetap untuk status & prioritas.
- Filter tetap tersimpan di URL (via `useDashFilters`-style params) sehingga bisa di-bookmark — opsional, mengikuti pola halaman lain.

## Verifikasi
- `tsgo --noEmit` build check.
- Playwright di preview: pilih cabang → daftar menyempit; ganti preset tanggal → hasil berubah; kombinasi status + cabang + tanggal; Reset → daftar penuh kembali; login sebagai admin_cabang → dropdown cabang terkunci.
