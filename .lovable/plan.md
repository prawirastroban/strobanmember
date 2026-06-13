# P1 — Public Tracking Link + Phone-Only Login (Paralel)

## A. Public Tracking Link (tanpa login)

Goal: customer (terutama staff-created) bisa pantau status booking lewat URL unik tanpa daftar/login.

### DB (migration baru)
- `bookings.public_track_token text unique` (di-generate otomatis via `gen_random_uuid()::text` saat insert oleh trigger BEFORE INSERT — token tetap stabil seumur booking).
- Index unik di `public_track_token`.
- RPC `get_public_booking_by_token(_token text)` `SECURITY DEFINER`:
  - return subset kolom aman: id, status, service_status, payment_status, service_name, booking_date, booking_time, branch, car_plate_number, customer_name (first name only), pickup_status, queue_estimated_start, created_at.
  - tidak expose email/HP, alamat lengkap, harga internal, notes.
- GRANT execute ke `anon, authenticated`. Tidak ada RLS baru pada `bookings` (akses lewat RPC saja).

### Frontend
- Route publik baru: `/t/:token` → page `PublicBookingTracker.tsx`.
- Tampilkan 6-stage tracker (re-use komponen LiveProgressTracker dalam mode read-only/public, atau buat versi ringan), nama service, tanggal/jam, plat (masked: `B 1•••• ABC`), branch, CTA WA support.
- Realtime: subscribe ke `bookings:id=eq.<id>` setelah fetch token → live update.
- SEO: noindex.

### Integrasi link
- `notify-booking-status`: kirim `https://www.bengkelstroban.com/t/<token>` (bukan `/booking/status/<id>`) untuk WA staff-created & default booking confirmation.
- WhatsApp welcome dari `admin-user-ops` create_customer tetap → `/reset-password-wa?phone=...`.

## B. Phone-Only Account (login pakai nomor HP)

Sudah ada infrastruktur `phoneToEmail()` + `phone.bengkelstroban.com`. Yang perlu:

### Edge function: `phone-otp-request` & `phone-otp-verify`
- `phone-otp-request { phone }`:
  - normalize → E164.
  - generate 6-digit OTP, simpan ke `wa_password_resets` (reuse) atau tabel baru `phone_otp_codes` dengan TTL 5 menit + rate limit (3/menit/IP, 5/jam/phone via `rate_limits`).
  - kirim via Fonnte WA: "Kode login Sahabat Stroban: 123456 (5 menit)".
- `phone-otp-verify { phone, code }`:
  - validasi OTP & TTL.
  - email = `phoneToEmail(phone)`. Jika user belum ada di `auth.users` → `auth.admin.createUser({ email, password: random, email_confirm: true, user_metadata: { phone, full_name: "" } })` + insert profile (`acquisition_source='phone_otp'`).
  - generate magic link via `auth.admin.generateLink({ type: 'magiclink', email })` → return `action_link` ke client.
  - client redirect ke action_link → Supabase set session → `AuthCallback` route normal.

### UI
- `/auth` tambahkan tab "Masuk dengan Nomor HP":
  - Step 1: input HP (+62 helper), klik kirim kode.
  - Step 2: input 6 digit OTP, klik verifikasi → redirect action_link.
- Tidak menghapus email/Google login.

### Linking ke P0
- Saat staff create_customer, customer terima WA welcome dengan 2 link: (a) tracking booking, (b) login HP (sudah cukup pakai page `/auth?phone=<digits>` → auto-prefill nomor → user request OTP). Hapus link `/reset-password-wa` di pesan welcome, ganti ke `/auth?login=phone&phone=<digits>`.

## Technical notes
- Token format: 32-char nanoid-ish (uuid string OK). Trigger:
  ```sql
  CREATE OR REPLACE FUNCTION public.set_booking_track_token() ...
    NEW.public_track_token := replace(gen_random_uuid()::text,'-','');
  ```
- OTP store schema (jika tabel baru):
  ```
  phone_otp_codes(id uuid pk, phone text, code_hash text, expires_at timestamptz,
                   consumed_at timestamptz, attempts int default 0, created_at timestamptz default now())
  ```
  RLS enabled, NO public policies — hanya edge function service_role.
- Semua perubahan non-breaking; route lama `/booking/status/:id` tetap berfungsi untuk user login.

## Out of scope (P2+)
- Tracking page klaim ke akun ("Ini booking saya, login").
- OTP via SMS (sekarang WA-only via Fonnte).
- Migrasi link history lama.

## Eksekusi (urut)
1. Migration: token bookings + trigger + RPC + tabel OTP.
2. Page `PublicBookingTracker` + route `/t/:token`.
3. Update `notify-booking-status` pakai token link.
4. Edge fn `phone-otp-request` + `phone-otp-verify`.
5. Tambah tab "Login HP" di `/auth`.
6. Update WA welcome message di `admin-user-ops`.