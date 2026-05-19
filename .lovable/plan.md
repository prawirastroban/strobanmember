## Flow Reset Password via WhatsApp OTP

### Konteks saat ini
- Login email & Google: pakai email asli → reset via email standar Supabase sudah berfungsi.
- Login WhatsApp (no HP): akun disimpan dengan email palsu `628xx@phone.local`, jadi `resetPasswordForEmail` **tidak bisa dipakai** (email tidak nyata). Inilah celah yang harus ditutup.
- Project sudah punya integrasi WhatsApp via **Fonnte** (dipakai di `notify-booking-status` & `admin-user-ops`).

### Rekomendasi flow (aman & sederhana)

```text
[Halaman /auth - tab Login Phone]
   ↓ klik "Lupa Password?"
[Dialog: masukkan no WhatsApp]
   ↓ submit  →  edge: wa-password-reset/request
   (cek user ada, rate-limit, generate OTP 6 digit, hash & simpan, kirim WA via Fonnte)
   ↓
[Halaman /reset-password-wa?phone=62xxx]
   ↓ user input OTP (6 digit, expire 10 menit, max 5 percobaan)
   ↓ submit  →  edge: wa-password-reset/verify
   (verifikasi hash + expiry + attempts, terbitkan reset_token 1x pakai, expire 15 menit)
   ↓ token tersimpan di state halaman (tidak di URL)
[Form password baru pada halaman yang sama]
   ↓ submit  →  edge: wa-password-reset/confirm
   (validasi reset_token, panggil admin API updateUserById utk ganti password)
   ↓ sukses → toast → redirect /auth, user login manual dgn password baru
```

### Keamanan
- **OTP**: 6 digit numerik, disimpan **hashed (SHA-256 + salt)** di tabel `wa_password_resets`, TTL 10 menit, max 5 percobaan verify.
- **Rate limit request**: max 3 OTP per nomor / 15 menit, max 10 / IP / jam (pakai kolom `requested_at` + `ip_hash`).
- **Reset token**: random 32-byte base64url, hashed di DB, single-use, TTL 15 menit, dikembalikan ke client hanya setelah OTP benar. Tidak pernah muncul di URL.
- **Enumeration protection**: response request OTP selalu sukses generik ("Jika nomor terdaftar, OTP telah dikirim") meski nomor tidak ada.
- **Tidak mengubah password tanpa OTP terverifikasi** — edge function `confirm` cek reset_token + status `verified`.
- **Tidak untuk akun Google/email**: cek `app_metadata.provider`/email asli → tolak dgn pesan "Gunakan reset via email".
- **Logging** ke `activity_logs` (request, verify success/fail, confirm) untuk audit.
- Semua edge function `verify_jwt = false` (public reset) + validasi input Zod + CORS standar.

### Perubahan teknis

**1. Migration baru**
- Tabel `wa_password_resets`:
  - `id`, `user_id` (nullable utk enumeration safety), `phone_e164`, `otp_hash`, `otp_salt`, `attempts int default 0`, `status` enum(`pending`,`verified`,`consumed`,`expired`), `reset_token_hash` (nullable), `ip_hash`, `requested_at`, `expires_at`, `verified_at`, `consumed_at`.
  - RLS: deny all dari client; hanya diakses via SECURITY DEFINER RPC / edge function dgn service role.
- Index pada `(phone_e164, requested_at desc)` dan `(reset_token_hash)`.
- Cleanup function `cleanup_expired_wa_resets()` (opsional dipanggil di awal request).

**2. Edge function baru `wa-password-reset`** (satu fungsi, 3 action via body `{action: "request"|"verify"|"confirm"}`)
- Pakai service role (`SUPABASE_SERVICE_ROLE_KEY`) + `FONNTE_TOKEN` (sudah ada).
- `request`: normalisasi nomor → `62xxx`, cek user via `admin.listUsers` filter email `${phone}@phone.local`, generate OTP, simpan, kirim WA pesan: *"Kode reset password Sahabat Stroban Service Anda: 123456. Berlaku 10 menit. Jangan bagikan ke siapa pun."*.
- `verify`: cek OTP, increment attempts, jika cocok → set `status=verified`, generate reset_token, return token plain.
- `confirm`: validasi reset_token, `supabase.auth.admin.updateUserById(user_id, { password })`, set `status=consumed`.

**3. Frontend**
- **`src/pages/Auth.tsx`**: di tab Phone tambahkan link "Lupa Password?" → buka dialog input nomor (mirip dialog forgot email yang sudah ada di line 267). Submit → panggil edge `request` → redirect ke `/reset-password-wa?phone=<masked>`.
- **`src/pages/ResetPasswordWA.tsx`** (baru): 2 step UI dalam satu halaman:
  - Step 1: input OTP 6 digit (komponen `InputOTP` sudah tersedia), tombol "Kirim ulang OTP" (disabled 60 detik countdown).
  - Step 2: form password baru + konfirmasi (pakai `PasswordInput` & validator yang sudah ada di `ResetPassword.tsx`), submit `confirm`.
  - Sukses → toast + redirect `/auth`.
- **`src/App.tsx`**: tambah route public `/reset-password-wa`.
- **`src/i18n/id.ts` & `en.ts`**: string baru (lupaPassword, kirimOTP, verifikasiOTP, dst).

### Yang tidak diubah
- Flow reset password via email tetap seperti sekarang (halaman `/reset-password`).
- Login Google tidak terpengaruh (mereka tidak punya password lokal).

### Catatan deploy
- Pastikan secret `FONNTE_TOKEN` & `SUPABASE_SERVICE_ROLE_KEY` aktif (sudah ada).
- Tambah entry `[functions.wa-password-reset]` di `supabase/config.toml` dengan `verify_jwt = false`.