## Goal

Saat staff / admin / CS Pusat klik notifikasi:
- **"Pendaftaran Baru"** (`type = new_registration`) → buka **detail konsumen** yang baru mendaftar.
- **"Booking Baru"** (`type = booking`, dari INSERT bookings) → buka **detail konsumen** pemilik booking tersebut.

Saat ini keduanya salah arah:
- `new_registration` → `/dashboard/user-verification` (sudah di-redirect ke `/dashboard/customers`, jadi cuma list).
- `booking` → `/profile/history-perawatan` (halaman customer, bukan staff).

Untuk **customer biasa**, perilaku notif tidak berubah.

---

## Change Summary

**2 file, tanpa migrasi DB destruktif. Hanya 1 migrasi kecil yang menambahkan field metadata baru.**

### 1. `supabase/migrations/<new>.sql` — tambah `customer_user_id` di metadata notif "Booking Baru"

Update fungsi `notify_booking_status_change()` (yang ada di migrasi `20260411154712`) — pada blok `IF TG_OP = 'INSERT'` untuk staff, tambahkan `customer_user_id: NEW.user_id` ke metadata. Field lain tidak berubah, jadi notif lama tetap valid.

```sql
-- hanya ganti blok INSERT staff:
INSERT INTO public.notifications (user_id, title, message, type, metadata)
VALUES (
  staff_record.user_id,
  'Booking Baru',
  'Booking baru dari ' || NEW.customer_name || ': ' || NEW.service_name,
  'booking',
  jsonb_build_object(
    'booking_id', NEW.id,
    'customer_user_id', NEW.user_id,
    'customer_name', NEW.customer_name,
    'redirect_to', '/dashboard/customers/' || NEW.user_id::text
  )
);
```

Dan di `notify_staff_new_registration()` (migrasi `20260410063802`), tambahkan `redirect_to` agar self-resolving:

```sql
jsonb_build_object(
  'registered_user_id', NEW.id,
  'redirect_to', '/dashboard/customers/' || NEW.id::text
)
```

Aman: hanya `CREATE OR REPLACE FUNCTION`. Tidak menyentuh tabel, kolom, RLS, atau data lama.

### 2. `src/components/NotificationBell.tsx` — role-aware fallback

Tambahkan fallback di `resolveRedirect()` untuk notif lama yang **belum punya** `redirect_to`:

- Jika current user adalah staff/admin/CS (pakai `useUserRole`), dan
  - `type === 'new_registration'` & `metadata.registered_user_id` ada → `/dashboard/customers/{registered_user_id}`.
  - `type === 'booking'` & `metadata.customer_user_id` ada → `/dashboard/customers/{customer_user_id}`.
  - `type === 'booking'` & hanya `booking_id` (notif lama) → `/dashboard/bookings` (list, fallback aman).
- Customer biasa: perilaku tidak berubah.

Tidak ada perubahan tampilan, props, atau API.

---

## Verification

1. Login sebagai staff/Owner → simulasi pendaftaran user baru → klik bel → harus buka `/dashboard/customers/<uuid>`.
2. Login sebagai staff → buat booking baru dari akun customer lain → klik notif "Booking Baru" → harus buka customer detail terkait.
3. Login sebagai customer biasa → notif booking sendiri → tetap ke `/profile/history-perawatan` (tidak berubah).
4. Notif lama (sebelum migrasi) untuk staff:
   - `new_registration` lama: `registered_user_id` sudah ada → tetap routing ke customer detail ✅.
   - `booking` lama: tidak ada `customer_user_id` → fallback ke `/dashboard/bookings` (aman, tidak crash).

---

## Risk & Rollback

- **Data risk: NONE.** Tidak ada DDL pada tabel, tidak ada drop/rename, tidak ada perubahan RLS.
- **Trigger risk: LOW.** Hanya menambah key di `jsonb_build_object`, payload notif lama tetap valid.
- **Rollback:** revert 1 commit (1 file FE + 1 file migrasi). Untuk DB, jalankan ulang versi `CREATE OR REPLACE FUNCTION` lama dari file migrasi sebelumnya.
- Tidak menyentuh booking aktif, pembayaran, atau alur customer.

---

**Menunggu persetujuan sebelum implementasi.**
