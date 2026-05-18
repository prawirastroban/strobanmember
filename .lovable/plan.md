## Tujuan
Pada `/dashboard/slots`, jam yang sudah lewat (untuk tanggal hari ini) harus otomatis terkunci: tidak bisa di-edit kapasitas/status, dan statusnya otomatis ditandai sebagai **closed** (auto-close di DB saat slot terlewat).

## Aturan "lewat"
- Sebuah slot `HH:MM` dianggap **lewat** jika tanggal yang dipilih = hari ini DAN waktu sekarang ≥ `HH:MM + 60 menit` (jam booking sudah berjalan sampai jam berikutnya, sesuai permintaan).
- Tanggal masa lalu → semua slot otomatis dianggap lewat (read-only + closed).
- Tanggal masa depan → tidak ada penguncian (perilaku saat ini).

## Perubahan (`src/components/admin/SlotsManager.tsx` saja)

1. **State waktu live**
   - Tambah `const [now, setNow] = useState(new Date())` + `setInterval(60_000)` (pakai `TIME_TICK_MS` dari `@/lib/timeSlots`).

2. **Helper `isSlotPast(slot_time)`**
   - Pakai `isSameLocalDay` & `slotToMinutes` dari `@/lib/timeSlots`.
   - `selectedDate < today` → true.
   - `selectedDate === today` → `nowMinutes >= slotMinutes + 60`.
   - Lainnya → false.

3. **Auto-close di DB (saat load)**
   - Setelah `load()` selesai, kumpulkan baris yang `isSlotPast` DAN `status !== "closed"`.
   - Lakukan satu `upsert` ke `booking_slots` dengan `status: "closed"` (tetap pakai `max_capacity` & booked yang ada, agar metrik historis tidak berubah).
   - Re-set state lokal supaya UI langsung sinkron tanpa loop fetch.
   - Hanya jalan kalau ada baris yang perlu diubah (hindari spam upsert).

4. **Lock UI per-baris (jika `isPast`)**
   - Tambahkan kelas visual: `opacity-60`, `pointer-events-none` pada bagian editor (Input kapasitas, Select status, tombol Tutup/Buka, tombol Simpan).
   - Tampilkan Badge kecil `🔒 Lewat` di samping jam.
   - Tombol Simpan baris di-disable.
   - Force tampilan status `closed` di Select (state lokal sudah closed setelah auto-close).

5. **Lock aksi bulk untuk slot lewat**
   - `applyCapacityToAll`, `setStatusForAll`, `resetToDefault`, `copyFromYesterday` hanya memodifikasi baris yang **tidak** lewat. Slot lewat tetap closed.
   - Tombol "Buka semua" tidak akan membuka slot yang sudah lewat.

6. **Tidak mengubah** skema DB, RLS, atau komponen lain. Hook `useSlotAvailability` di sisi customer sudah otomatis menghormati `status = closed` (sudah dibereskan pada perubahan sebelumnya).

## Hasil
- Saat jam 09:05 (slot 08:00 sudah lewat ≥ 60 menit dari 08:00 → 09:00), slot 08:00 langsung tampil terkunci & auto-set ke closed di DB.
- Admin tidak bisa lagi mengubah kapasitas/status slot lewat dari panel.
- Tampilan customer otomatis menyembunyikan slot tersebut (sudah ditangani `filterFutureSlots` + status closed).