## Tujuan
Tampilkan **pembuat data booking** (siapa yang menginput) di panel `BookingsManager` (`/dashboard/bookings`). Berguna untuk membedakan booking yang dibuat oleh pelanggan sendiri vs dibuat oleh staff/CS lewat Quick Booking.

## Cara Kerja
Tabel `bookings` belum punya kolom pembuat — `user_id` adalah pemilik booking (pelanggan), bukan operator yang menginputnya. Tambah kolom baru `created_by uuid` yang menyimpan `auth.uid()` pada saat insert, lalu tampilkan nama-nya di kartu booking.

Label:
- Jika `created_by = user_id` → **"Dibuat oleh: Pelanggan"** (self-booking).
- Jika beda atau role-nya staff/admin → **"Dibuat oleh: {Nama Staff}"** dengan badge kecil "Staff".
- Jika null (data lama) → tidak ditampilkan.

## Yang Akan Dibuat / Diubah

### 1. Migrasi DB
- `ALTER TABLE bookings ADD COLUMN created_by uuid;` (nullable).
- Index opsional: `CREATE INDEX idx_bookings_created_by ON bookings(created_by);`.
- Tidak ada perubahan RLS (kolom ikut policy existing).

### 2. Isi `created_by` pada semua jalur insert
- `src/pages/Booking.tsx` (insert customer flow) → `created_by: user.id`.
- `src/components/booking/MobileBookingWizard.tsx` → `created_by: user.id`.
- `src/components/admin/QuickBookingDialog.tsx` → `created_by: <currentStaff.id>`.
- `src/components/admin/StaffQuickBookingDialog.tsx` (2 insert) → `created_by: <currentStaff.id>`.
- Edge function `supabase/functions/midtrans-create-cart-checkout/index.ts` → `created_by: user.id` (user dari JWT).
- Edge function `supabase/functions/midtrans-test-transaction/index.ts` → `created_by: user.id`.

### 3. Tampilkan di UI
- `src/components/admin/BookingsManager.tsx`:
  - Saat query daftar booking, select tambahan `created_by`.
  - Setelah daftar booking dimuat, kumpulkan unique `created_by` yang berbeda dari `user_id`, batch fetch `profiles(id, full_name)` & `user_roles(role)` untuk mapping nama+role.
  - Render baris kecil di kartu desktop & mobile: "Dibuat oleh: Pelanggan" atau "Dibuat oleh: {Nama} · Staff" — gaya `text-xs text-muted-foreground` agar tidak berisik.

## Catatan
- Data lama (sebelum migrasi) `created_by` akan NULL — sengaja tidak di-backfill karena tidak ada sumber kebenaran. UI cukup sembunyikan baris jika null.
- Tidak mengubah `user_id` atau ownership; hanya menambah jejak audit ringan.

## Verifikasi
1. Buat booking sebagai pelanggan biasa → kartu menampilkan "Dibuat oleh: Pelanggan".
2. Buat booking via Staff Quick Booking (login Owner) → kartu menampilkan "Dibuat oleh: {Nama Owner} · Staff".
3. Booking lama tetap muncul tanpa baris tambahan.
