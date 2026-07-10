## Plan Perbaikan SPK dari Booking Test

### Masalah yang ditemukan
- Booking **Test Ganteng** ada di database dengan status `in_progress`.
- SPK untuk booking itu juga ada, tetapi statusnya `cancelled`.
- Form **Buat SPK Baru** menganggap booking sudah punya SPK hanya karena `booking_id` pernah ada di `spk_orders`, sehingga booking test tidak muncul lagi di pilihan booking.
- Queue `/spk` saat ini mengambil nama/kendaraan dari `profiles` dan `vehicles`; jika data relasi tidak lengkap, snapshot asli dari booking/SPK bisa tidak tampil akurat.

### Perubahan yang akan dibuat
1. **Perbaiki filter booking di `SPKNewForm`**
   - Booking status `checked_in` / `in_progress` tetap muncul jika SPK terkait sudah `cancelled` atau `deleted_at` tidak null.
   - Yang disembunyikan hanya booking yang sudah punya SPK aktif/non-cancelled.

2. **Perbaiki idempotency `SPKService.createFromBooking`**
   - Jika booking punya SPK aktif, pakai SPK itu.
   - Jika SPK lama statusnya `cancelled`, buat SPK baru dari snapshot booking.
   - Ini membuat tombol **Mulai Dikerjakan** aman dites ulang setelah SPK sebelumnya dibatalkan.

3. **Perbaiki `/spk` Work Queue agar membaca snapshot data**
   - Query `spk_orders` juga mengambil `booking_id` dan `data`.
   - Nama pelanggan, HP, kendaraan, plat, dan service memakai fallback berurutan: `profiles/vehicles` → `spk_orders.data` → `bookings`.
   - Jadi SPK dari booking tetap tampil walau profile/vehicle belum lengkap.

4. **Verifikasi**
   - Cek query database setelah perubahan: booking `Test Ganteng` masuk daftar eligible untuk SPK baru karena SPK lamanya cancelled.
   - Verifikasi UI `/spk/new` bisa menampilkan booking tersebut di tab Booking.
   - Verifikasi `/spk` menampilkan data SPK aktif dari booking dengan nama/plat yang benar, bukan placeholder.

### Batasan
- Tidak menghapus data test otomatis tanpa instruksi eksplisit.
- Tidak mengubah runtime/workflow/approval engine; hanya memperbaiki binding data booking → SPK dan tampilan queue.