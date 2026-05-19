# Samakan hak Admin Cabang dengan CS Pusat untuk Status Booking

## Masalah
Saat admin cabang menekan **Konfirmasi** pada booking yang belum dibayar, muncul error:
> Cannot confirm booking: payment_status must be paid (current: unpaid)

Padahal CS Pusat (role `admin`/`staff`) bisa melakukannya. Penyebabnya: trigger validasi di database (`validate_booking_status_transition`) hanya mengecek role `admin` dan `staff`. Role `admin_cabang` tidak dikenali sebagai staf, sehingga jatuh ke jalur "customer" yang mensyaratkan pembayaran lunas dulu.

Beberapa fungsi RPC booking lain (`confirm_booking`, `approve_booking_cancellation`, `reject_booking_cancellation`, `protect_webhook_fields`) juga hanya mengizinkan `admin`/`staff`, sehingga admin cabang berpotensi gagal di aksi lain juga.

## Rencana Perbaikan (1 migrasi SQL)

1. **`validate_booking_status_transition`** — tambahkan `admin_cabang` ke pengecekan staf:
   ```
   v_is_staff := has_role(uid,'admin') OR has_role(uid,'staff') OR has_role(uid,'admin_cabang')
   ```
   Dengan ini admin cabang bebas pindah status (termasuk Konfirmasi tanpa harus paid).

2. **`confirm_booking`, `approve_booking_cancellation`, `reject_booking_cancellation`** — tambahkan `OR has_role(auth.uid(),'admin_cabang')` pada guard authorization.

3. **`protect_webhook_fields`** — izinkan admin_cabang melewati proteksi field manual yang sama seperti staff/admin.

4. **Tidak mengubah RLS `bookings`** — policy `Admin cabang can update branch bookings` sudah benar (sudah membatasi per cabang). Tidak ada perubahan frontend yang diperlukan.

## Catatan Cakupan
- Fungsi lain (pembayaran manual, loyalty, referral, withdrawal) **tidak diubah** karena di luar lingkup permintaan ("action status booking").
- Tidak ada perubahan UI/komponen React.

Setelah migrasi ini, admin cabang dapat melakukan Konfirmasi, Mulai Pengerjaan, Selesai, Batalkan, dll. pada booking di cabangnya — sama persis seperti CS Pusat.
