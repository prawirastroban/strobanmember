# Reset Password — Lengkapi & Samakan Flow

Ada dua masalah:
1. **LoginDialog** (modal login yang muncul saat klik "Masuk" dari mobile/home — screenshot 1) tidak punya tombol "Lupa Password?". Hanya halaman `/auth` yang punya.
2. **Aksi Reset Password di `/dashboard/customers`** (screenshot 2) langsung mengubah password user lewat admin (admin set password manual). User tidak diberi otonomi & tidak aman. Harus disamakan dengan flow OTP terbaru.

---

## 1. Tombol "Lupa Password?" di LoginDialog

Tambah link "Lupa Password?" di bawah tombol Masuk pada `src/components/LoginDialog.tsx`, identik dengan `Auth.tsx`:
- Jika `loginMethod === "email"` → buka dialog input email → `supabase.auth.resetPasswordForEmail` (alur lama, sudah ada di Auth.tsx).
- Jika `loginMethod === "phone"` → buka dialog input nomor WA → invoke `wa-password-reset` action `request` → redirect ke `/reset-password-wa?phone=...`.

Reuse komponen dialog yang sudah ada di `Auth.tsx` dengan mengekstrak helper kecil, atau cukup duplikasi state + dialog (konsisten karena pendek).

---

## 2. Admin Reset Password → OTP Flow

### Flow baru
Saat admin klik **Reset Password** di `/dashboard/customers`:

1. Dialog baru: pilih **kanal kirim OTP**
   - **WhatsApp** (default jika user punya phone)
   - **Email** (default jika user phone-less / akun email murni)
   - Auto-disable kanal yang tidak punya kontaknya
2. Admin klik "Kirim OTP Reset".
3. Backend kirim kode 6 digit ke user via kanal terpilih + simpan permintaan.
4. Toast sukses + tampilkan info: "OTP dikirim ke 628xxx / user@mail. User akan menerima link/instruksi untuk reset password sendiri."
5. User menerima pesan berisi OTP + link ke halaman reset (`/reset-password-wa?phone=...` untuk WA, atau halaman baru `/reset-password-otp?email=...` untuk email).
6. User input OTP → set password baru → selesai.

Admin **tidak lagi** bisa mengetik password user secara manual (menghapus kemampuan admin mengetahui password user — lebih aman, audit-friendly).

### Backend

**a. Edge function baru `email-password-reset`** (mirror dari `wa-password-reset`, 3 action: `request | verify | confirm`).
- Kirim OTP via Resend (sudah terkonfigurasi di project).
- Gunakan table `wa_password_resets` yang sudah ada — tambah kolom `channel` (enum: `whatsapp | email`) dan `email` (nullable). Untuk email, `phone_e164` boleh null.

**b. Edge function baru `admin-trigger-password-reset`** (verify_jwt = true, admin/staff only):
- Input: `userId`, `channel: "whatsapp" | "email"`.
- Validasi caller role (admin / staff / admin_cabang).
- Lookup user (auth.users + profiles).
- Generate OTP, simpan ke `wa_password_resets` (dengan `triggered_by_admin = caller.id`), kirim via Fonnte atau Resend.
- Tulis ke `admin_audit_logs` (action `user.password_reset_otp_sent`).
- Return `{ ok, masked_target, channel }`.

### Migration
- `ALTER TABLE wa_password_resets ADD COLUMN channel text NOT NULL DEFAULT 'whatsapp'`
- `ADD COLUMN email text`, `ADD COLUMN triggered_by_admin uuid`
- `ALTER COLUMN phone_e164 DROP NOT NULL`
- Validation trigger: salah satu `phone_e164` atau `email` wajib terisi.

### Frontend

- `src/components/admin/CustomerList.tsx`:
  - Ganti `passwordDialog` content: tombol "Kirim OTP via WhatsApp" + "Kirim OTP via Email" (disabled sesuai ketersediaan kontak). Hapus input password manual.
  - `handleResetPassword` → invoke `admin-trigger-password-reset`.
- `src/pages/ResetPasswordWA.tsx`: generalize sedikit agar bisa dipakai email juga, ATAU buat `src/pages/ResetPasswordOTP.tsx` baru untuk email. **Rekomendasi**: buat satu komponen reusable + 2 route (`/reset-password-wa`, `/reset-password-email`).
- `src/pages/Auth.tsx` & `src/components/LoginDialog.tsx`: untuk forgot-email, opsional ganti dari `resetPasswordForEmail` (magic link) ke OTP email yang sama (lebih konsisten + tidak butuh deep-link Supabase redirect). **Rekomendasi**: ya, ganti ke OTP — semua kanal seragam.

---

## Pertanyaan sebelum eksekusi

1. **Kanal email**: ganti reset password email lama (`resetPasswordForEmail` magic link) menjadi **OTP 6 digit via Resend** supaya seragam dengan WA? Atau biarkan email pakai magic link lama, hanya tambah OTP untuk WA + admin trigger?
2. **Admin set password manual**: hapus sepenuhnya, atau tetap sisakan sebagai opsi fallback (dengan warning) untuk kasus user kehilangan akses ke email & WA?

