## Tujuan
Mencegah 1 orang membuat banyak akun (anti-tuyul lapisan signup):
- **Email unik** → sudah default di Supabase Auth, kita perketat juga di `profiles` lewat unique index (jaga-jaga normalisasi case).
- **IP signup unik (hard block)** → IP yang sudah pernah dipakai daftar TIDAK boleh dipakai daftar lagi. Signup ditolak langsung (bukan sekadar fraud-score).

Berlaku untuk semua metode signup: Email/password, Phone OTP, Google OAuth.

## Perubahan Database (migration)

1. **Index unik email (case-insensitive) di `profiles`**
   - Tambah generated column / unique index `lower(email)` jika kolom email ada di profiles. Jika tidak ada, tetap mengandalkan `auth.users` (sudah unik) dan skip.

2. **Index unik IP signup di `profiles`**
   ```sql
   CREATE UNIQUE INDEX profiles_signup_ip_unique
     ON public.profiles (signup_ip)
     WHERE signup_ip IS NOT NULL;
   ```
   - Artinya IP yang sudah tercatat tidak bisa muncul lagi.

3. **Tabel allowlist IP (opsional tapi perlu)**
   ```
   referral_ip_allowlist (ip text PK, reason text, created_by uuid, created_at)
   ```
   - Untuk kasus kantor / warnet / keluarga yang sah. Admin bisa whitelist sebuah IP supaya boleh dipakai >1×.

4. **Function `assert_signup_ip_unique(_ip text)`**
   - SECURITY DEFINER. Cek:
     - Jika `_ip` ada di `referral_ip_allowlist` → izinkan.
     - Jika sudah ada di `profiles.signup_ip` atau `referral_signups_meta.signup_ip` → raise exception `duplicate_signup_ip`.
   - Dipanggil oleh edge function `attach-referrer` **dan** edge function baru `signup-precheck`.

5. **Trigger `profiles_block_duplicate_ip` (defense in depth)**
   - BEFORE INSERT/UPDATE OF signup_ip ON profiles → panggil `assert_signup_ip_unique` (skip jika allowlisted). Trigger ini menutup celah kalau IP di-set lewat jalur lain.

## Edge Function

**Baru: `signup-precheck`** (public, no JWT)
- Input: `{ email: string }`
- Server membaca `x-forwarded-for` → IP klien.
- Jalankan `assert_signup_ip_unique(ip)` dan cek email belum ada di `auth.users` (via service role `admin.listUsers` filter, atau `profiles`).
- Return:
  - `{ ok: true }` → frontend boleh lanjut signup.
  - `{ ok: false, reason: 'duplicate_email' | 'duplicate_signup_ip' }` → frontend tampilkan error dan blok tombol.

**Update: `attach-referrer`** (sudah ada)
- Tambah panggilan `assert_signup_ip_unique` di awal. Kalau gagal → hapus akun yang baru saja dibuat (rollback) dan return error, supaya tidak ada profil tergantung.

## Frontend

1. **`src/pages/Auth.tsx` & `src/components/LoginDialog.tsx`**
   - Sebelum memanggil `supabase.auth.signUp` / `signInWithOtp` / OAuth, panggil `supabase.functions.invoke('signup-precheck', { body: { email } })`.
   - Jika `duplicate_signup_ip` → tampilkan toast & inline error: "Perangkat/jaringan ini sudah pernah digunakan untuk mendaftar. Silakan gunakan akun yang sudah ada atau hubungi admin."
   - Jika `duplicate_email` → toast "Email sudah terdaftar, silakan login."
   - Untuk Google OAuth: precheck dijalankan saat callback (`AuthCallback.tsx`) sebelum membuat profile; jika gagal → sign-out + delete user + redirect dengan pesan error.

2. **`src/pages/AuthCallback.tsx`**
   - Setelah session siap, jalankan `signup-precheck` (tanpa email karena sudah login) dengan body `{ mode: 'oauth' }`. Bila duplikat IP → `supabase.auth.signOut()` + edge function hapus user, redirect ke `/auth?error=duplicate_ip`.

## Admin UI

**`src/components/admin/keuangan/AntiFraudPanel.tsx`** — tambah tab/section "IP Allowlist":
- List `referral_ip_allowlist` (ip, reason, created_by, created_at).
- Form tambah IP + alasan, tombol hapus.
- Quick-add dari log fraud: tombol "Whitelist IP ini" di samping setiap log `duplicate_signup_ip`.

## Catatan teknis
- IP diambil dari header `x-forwarded-for` (ambil entry pertama, trim). IPv6 disimpan apa adanya.
- `signup-precheck` harus pakai service role untuk query auth + bypass RLS allowlist.
- Pesan error frontend pakai bahasa Indonesia, sesuai konvensi project.
- Tidak menyentuh aturan komisi/fraud-score yang sudah ada — ini lapisan tambahan di gerbang signup.

## File yang akan disentuh
- **Baru**: `supabase/migrations/<ts>_signup_unique_ip.sql`, `supabase/functions/signup-precheck/index.ts`
- **Edit**: `supabase/functions/attach-referrer/index.ts`, `src/pages/Auth.tsx`, `src/components/LoginDialog.tsx`, `src/pages/AuthCallback.tsx`, `src/components/admin/keuangan/AntiFraudPanel.tsx`
