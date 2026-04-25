## Goal

Ubah flow status booking dari saat ini:
`Diterima → Menunggu → Konfirmasi → Dikerjakan → Selesai`

Menjadi:
`Diterima (pending) → Dikonfirmasi (confirmed) → Check-In (checked_in) → Dikerjakan (in_progress) → Selesai (completed)`

Status `waiting_confirmation` dihapus dari UI flow user. Tambahkan tombol **Check-In** di admin panel pada baris booking yang sudah `confirmed`.

## Perubahan

### 1. `src/pages/MyBooking.tsx` (tampilan progress user)
- Hapus step `waiting_confirmation` dari `STATUS_STEPS`.
- Step baru (5 langkah): Diterima → Dikonfirmasi → Check-In → Dikerjakan → Selesai.
- `pending` di-map sebagai langkah 0 (Diterima). Jika DB masih mengirim `waiting_confirmation` (legacy), tampilkan sebagai langkah Diterima juga (fallback ke pending).
- Update `canRequestCancel` agar tetap mencakup `confirmed`, `checked_in`, `in_progress`.

### 2. `src/components/admin/BookingsManager.tsx` (admin panel)
- Update `STATUS_OPTIONS`: hilangkan `waiting_confirmation`; tambahkan `checked_in` (Check-In, ikon `Car`) di antara Dikonfirmasi dan Sedang Dikerjakan.
- Tambahkan tombol aksi **Check-In** (warna biru, ikon Car) yang muncul khusus saat `booking.status === "confirmed"`. Tombol memanggil `updateStatus(id, "checked_in")`.
- Tombol **Confirm Booking** existing tetap muncul untuk `waiting_confirmation` (legacy data) DAN juga untuk `pending` yang sudah `paid`/`pay_later` agar konsisten dengan flow baru (skip step menunggu).
- Sorting/badge "baru" yang sebelumnya menghitung `waiting_confirmation` diganti menghitung `pending` yang sudah dibayar (siap dikonfirmasi) + sisa `waiting_confirmation` legacy.
- Tab "Sedang Dikerjakan" diperluas mencakup `checked_in` juga.

### 3. `src/lib/bookingStatus.ts`
- Update label `pending` → "Diterima" (deskripsi: "Booking diterima, menunggu konfirmasi staff").
- `checked_in` sudah ada — pastikan label "Check-In" dan `step: 2`.
- Geser step index agar konsisten 5-langkah: pending=0, confirmed=1, checked_in=2, in_progress=3, completed=4.
- Update `FORWARD` transitions: `pending → confirmed`, `confirmed → checked_in`, `checked_in → in_progress`, `in_progress → completed`. Tetap pertahankan `waiting_confirmation → confirmed` sebagai fallback legacy.
- `CANONICAL_STATUSES` diperbarui sesuai flow baru.

### 4. Catatan
- Tidak ada migrasi DB. Data lama dengan status `waiting_confirmation` tetap bisa dirender (fallback ke "Diterima" di UI user, tetap muncul opsi di admin sebagai legacy via select tetap berfungsi karena DB menerima string apa saja).
- Komponen lain (`LiveProgressTracker`, `ServiceProgress`) tidak diubah pada iterasi ini karena tidak diminta dan masih kompatibel; bisa ditangani terpisah jika diperlukan.
