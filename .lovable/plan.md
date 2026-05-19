## Masalah

Saat customer membuat booking baru, **admin & staff tidak menerima notifikasi** (bell di dashboard tetap kosong). Penyebabnya:

1. Trigger lama `notify_booking_status_change` (migrasi 11 Apr 2026) memiliki blok `IF TG_OP = 'INSERT'` yang melakukan loop ke seluruh `user_roles` (admin + staff) dan memasukkan notifikasi `"Booking Baru"`.
2. Migrasi 15 Mei 2026 menulis-ulang fungsi tersebut untuk fokus ke status & payment change → blok `INSERT` (notifikasi staff) **hilang total**, hanya `NEW.user_id` (customer) yang dapat notif.
3. Selain itu ada **dua trigger yang memanggil fungsi yang sama** (`trg_notify_booking_status_change` dari migrasi lama + `trg_booking_status_notify` dari migrasi baru) → setiap UPDATE notif customer terkirim 2× (efek samping).

## Yang akan diperbaiki

### 1. Migrasi baru — `restore_staff_new_booking_notification.sql`

- Drop trigger duplikat `trg_notify_booking_status_change` agar UPDATE tidak double-fire.
- Buat fungsi terpisah `public.notify_staff_on_new_booking()` (`SECURITY DEFINER`, `search_path=public`) yang dipanggil `AFTER INSERT ON public.bookings`. Logika:
  - Loop `SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff')`.
  - Insert ke `public.notifications` untuk tiap staff dengan:
    - `title`: `'Booking Baru'`
    - `message`: `'Booking baru dari ' || customer_name || ' — ' || service_name || ' (' || branch || ')'`
    - `type`: `'booking'`
    - `metadata`: `{ booking_id, customer_name, service_name, booking_date, booking_time, branch, redirect_to: '/dashboard/bookings' }`
  - Bungkus dengan `EXCEPTION WHEN OTHERS THEN RAISE WARNING` agar tidak pernah memblokir INSERT booking.
- Buat trigger `trg_notify_staff_new_booking AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION notify_staff_on_new_booking();`

### 2. Konsistensi notifikasi staff lain (audit cepat)

Tetap berfungsi, tidak diubah:
- Komplain baru (`complaints` insert) — sudah loop admin/staff.
- Internal reports — sudah ada.
- Manual payment proof upload — sudah ada.
- Vehicle baru / loyalty / invoice → customer-only (sengaja).

### 3. Tidak ada perubahan frontend

`NotificationBell` sudah subscribe realtime `INSERT` di `notifications` dengan filter `user_id=eq.${user.id}` → notifikasi baru otomatis muncul untuk staff/admin yang login.

## File yang diubah

- `supabase/migrations/<timestamp>_restore_staff_new_booking_notification.sql` (baru)

Tidak ada edit frontend / edge function untuk perubahan ini.

## Catatan branch-scoping

Saat ini tabel `bookings` tidak punya kolom `branch_id` (hanya `branch` TEXT), dan `user_roles` tidak menyimpan branch assignment. Jadi notifikasi dikirim ke **semua admin & staff** (sama dengan perilaku lama sebelum regresi). Branch-scoping bisa dilakukan di tahap berikutnya jika user ingin per-cabang routing — perlu skema `staff_branch_assignments` terlebih dulu.
