## Temuan Audit

Cek auth logs + DB:

- **7 user** di `auth.users` masih `email_confirmed_at = NULL` walau profilnya `is_verified = true` (mis. `6289628200733@phone.bengkelstroban.com`, `dudukula78@gmail.com`, dll). Mereka tidak bisa login.
- Log auth saat ini selalu memunculkan `error_code: invalid_credentials` (HTTP 400) — bukan lagi `email_not_confirmed`. Supabase memang sengaja menyamarkan pesan untuk anti user-enumeration.
- Karena pesan tidak lagi "email not confirmed", **fallback auto-confirm di `AuthContext.signIn` tidak pernah jalan** → user yang seharusnya bisa dipulihkan tetap stuck "kata sandi salah".
- Sebagian akun lama memakai domain sintetis lama `@phone.local`. Login lewat form HP saat ini hanya mencoba `@phone.bengkelstroban.com`, jadi user lama otomatis gagal.
- Signup HP via `supabase.auth.signUp` di client mengandalkan email sintetis. Supabase kadang tidak meng-auto-confirm akun ini, sehingga setiap signup HP baru beresiko langsung jadi "tidak bisa login".
- 1× POST `/signup` 422 hari ini — kemungkinan password lemah / email ditolak; pesannya tidak dipetakan ke Indonesia di kedua form.

## Rencana Perbaikan

### 1. Auto-confirm di sisi server saat signup (root cause)
Buat edge function baru `auth-signup` (public, no JWT) yang menerima `{ email, password, full_name, phone, mode: 'email'|'phone' }`:
- Jalankan `signup-precheck` (IP + duplicate email) sebagaimana sekarang.
- Buat akun via `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone, registration_source } })` → semua akun langsung aktif tanpa bergantung pesan login.
- Jika email sudah ada tapi `email_confirmed_at` masih NULL → langsung `updateUserById({ email_confirm: true })`.
- Kembalikan `{ ok: true }` agar client melanjutkan login.

Ubah `Auth.tsx` (`handleSignup`) dan `LoginDialog.tsx` (`handleSignup`) memanggil endpoint baru ini alih-alih `supabase.auth.signUp` langsung. Setelah sukses, langsung trigger `signIn(emailToUse, password)` supaya user masuk tanpa diminta login lagi.

### 2. Fallback "invalid credentials" → coba auto-confirm
Di `src/contexts/AuthContext.tsx` `signIn`, tambahkan: bila error message berisi `invalid login credentials` (bukan hanya `email not confirmed`), panggil `admin-user-ops` `confirm_email_by_email` SEKALI; jika sukses, retry `signInWithPassword`. Ini menyelamatkan 7 user existing tanpa migrasi DB.

### 3. Fallback domain legacy `@phone.local` untuk login HP
Di `AuthContext.signIn`, jika `emailToUse` berakhiran `@phone.bengkelstroban.com` dan login pertama gagal `invalid_credentials`, otomatis retry dengan domain `@phone.local` sebelum menampilkan error. (Sama dengan logika lookup di `phone-otp-login`.)

### 4. Backfill 7 akun unconfirmed
Tambahkan action baru `backfill_unconfirmed` di `admin-user-ops` (admin-only) yang loop semua user `email_confirmed_at IS NULL` dan profilnya `is_verified=true` lalu `email_confirm: true`. Tambahkan tombol kecil "Aktifkan ulang akun belum terkonfirmasi" di `dashboard/maintenance` (tab Audit). Sekali klik → semua user lama bisa login.

### 5. Pesan error konsisten Bahasa Indonesia
- Pindahkan `friendlyAuthError` (sekarang di `Auth.tsx`) ke `src/lib/authErrors.ts`.
- Petakan tambahan: `weak_password`, `password_too_short`, `email_address_invalid`, `signup_disabled`, `over_email_send_rate_limit`, `over_request_rate_limit`.
- `LoginDialog.tsx` `handleLogin` & `handleSignup` pakai mapping yang sama (sekarang masih `error.message` mentah).

### 6. Validasi & UX kecil
- Pre-check password minimal 8 karakter di `Auth.tsx`/`LoginDialog.tsx` sebelum POST (cegah 422 weak password).
- Trim spasi pada email & nama sebelum dikirim.

## Catatan teknis

```
src/contexts/AuthContext.tsx         (perubahan signIn: fallback + legacy domain)
src/lib/authErrors.ts                (baru, shared friendlyAuthError)
src/pages/Auth.tsx                   (pakai authErrors, panggil auth-signup, pre-validate password)
src/components/LoginDialog.tsx       (idem)
supabase/functions/auth-signup/      (baru: admin.createUser + email_confirm)
supabase/functions/admin-user-ops/   (tambah action backfill_unconfirmed)
src/components/admin/system/...      (tombol backfill di Maintenance Center → Audit)
```

Tidak ada perubahan skema DB, tidak menyentuh `auth` schema langsung — semua via Admin API. Tidak mengubah fitur lain (OTP login, OAuth Google, reset password WA tetap apa adanya).
