## Tujuan
Pastikan badge "X/Y slot" pada kartu cabang di Hero Booking benar-benar mencerminkan kapasitas per jam yang diatur admin di **SlotsManager**, bukan hanya angka default.

## Temuan
- `BranchRow` (`HeroBookingForm.tsx` line 752) memanggil `useSlotAvailability(branch.slug, date, ALL_SLOTS_CONST)`. Wiring branch identifier sudah benar (slug cocok dengan `booking_slots.branch` & `bookings.branch`).
- `useSlotAvailability` sudah membaca `booking_slots.max_capacity` per (branch, date, slot_time) dan menggabungkan jumlah booking realtime — jadi jika baris ada, kapasitas mengikuti pengaturan.
- Masalah yang menyebabkan tampilan terlihat "tidak sinkron":
  1. **Default fallback 3** dipakai saat baris `booking_slots` belum dibuat untuk tanggal itu → semua cabang yang belum dikonfigurasi selalu tampil `24/24`, terlihat seragam meski admin set angka lain di slot lain.
  2. **Slot `closed`** tetap ikut dihitung di `total` (`max`), padahal tidak bisa dipesan → angka penyebut menyesatkan.
  3. **Slot yang sudah lewat hari ini** tetap ikut dihitung di `total` dan `remaining`, sehingga sisa slot tidak menurun saat jam berjalan.
  4. Daftar jam `ALL_SLOTS_CONST` di-hardcode terpisah di tiga tempat (Hero, SlotsManager, QuickBooking). Selama identik tidak masalah, tapi rawan drift.

## Rencana Perubahan (hanya frontend)

1. **`src/hooks/useSlotAvailability.ts`**
   - Tetap pakai `DEFAULT_CAPACITY = 3` sebagai fallback (cocok dengan default kolom DB).
   - Tambah field `effectiveMax` di `SlotInfo` = `status === "closed" ? 0 : max`, supaya konsumen bisa menghitung total yang benar-benar dapat dipesan.

2. **`src/components/mobile/home/HeroBookingForm.tsx` — `BranchRow`**
   - Sebelum agregasi, filter `ALL_SLOTS_CONST` lewat `filterFutureSlots(ALL_SLOTS_CONST, date, now)` agar jam yang sudah lewat hari ini tidak ikut dihitung.
   - Ubah perhitungan `totals`:
     - `total = Σ effectiveMax` (mengecualikan slot `closed`)
     - `remaining = Σ (status === "available" ? remaining : 0)`
     - `isFull = total > 0 && remaining <= 0`
   - Jika `total === 0` (semua closed / sudah lewat) tampilkan `"Tutup"` alih-alih `"0/0 slot"`.
   - Tambahkan tick `setInterval(setNow, TIME_TICK_MS)` lokal di BranchRow (atau terima `now` dari parent yang sudah punya state `now`) supaya filter jam lewat ikut update tiap menit.

3. **Tidak mengubah DB, RLS, atau SlotsManager.** Pengaturan kapasitas tetap satu sumber kebenaran di tabel `booking_slots`.

## Hasil yang Diharapkan
- Cabang dengan kapasitas yang sudah diatur per jam → angka penyebut berubah sesuai (mis. yogyakarta 08:00 = 2 → `23/23 slot` dari sebelumnya `24/24`).
- Slot ditutup admin tidak menambah penyebut.
- Saat jam berjalan di hari yang sama, penyebut & sisa slot ikut menyusut otomatis.
- Cabang yang belum dibuatkan baris `booking_slots` tetap pakai default 3/jam (perilaku lama) — bisa ditambah toggle UI atau pengaturan default capacity per cabang di iterasi berikutnya jika diinginkan.