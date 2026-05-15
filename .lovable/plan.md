## Tujuan

Di dialog **Edit Customer**:
1. Tambahkan field **Email** yang **editable** untuk semua role dashboard (Staff, CS Pusat, Admin Cabang). Customer tidak punya akses dashboard, jadi pembatasan otomatis.
2. Di samping field **Phone**, tambahkan tombol **"Verifikasi via WA"** yang mengirim pesan verifikasi via Fonnte. Jika Fonnte konfirmasi terkirim → `phone_verified = true` otomatis + badge hijau **"✓ Terverifikasi"**.

## Perubahan

### 1. Edge function `supabase/functions/admin-user-ops/index.ts`
Tambah 2 action baru (akses: `staff`, `admin`, **`admin_cabang`**):

**`update_email`** — body `{ userId, newEmail }`
- Validasi format email (Zod / regex).
- Cek uniqueness via `auth.admin.listUsers` — tolak jika sudah dipakai user lain.
- `auth.admin.updateUserById(userId, { email: newEmail, email_confirm: true })`.
- Audit log `user.email_change`.

**`verify_phone_wa`** — body `{ userId, phone }`
- Normalize phone (helper `normalizePhone` — sama logic dengan `send-review-reminders`: harus `628xxxxxxxxx`, 11–15 digit, bukan dummy).
- Tolak jika tidak valid.
- Cek **uniqueness**: query `profiles` → tolak jika nomor sudah dipakai user lain dan `phone_verified=true` (anti dual-account, sejalan dengan rule referral).
- Update `profiles.phone = normalized` (simpan format 628xxx).
- Kirim pesan ke Fonnte: *"Halo, nomor WhatsApp ini telah diverifikasi sebagai kontak resmi akun Sahabat Stroban Service Anda. Abaikan jika bukan Anda."*
- Jika Fonnte sukses (`status: true`):
  - Update `profiles.phone_verified = true`, `phone_verified_at = now()`.
  - Audit log `user.phone_verified`.
  - Return `{ success: true, phone: normalized }`.
- Jika gagal: return `{ success: false, error }`.
- Cek role caller diperluas: `isStaff || isAdmin || isAdminCabang` untuk 2 action baru ini.

### 2. `src/components/admin/EditCustomerDialog.tsx`
- Extend prop `customer` dengan `email: string | null` dan `phone_verified: boolean`.
- State baru: `email`, `initialEmail`, `phoneVerified`, `verifyingPhone`, `savingEmail`.
- **Email field**: `<Input type="email">` dengan validasi Zod (`z.string().trim().email().max(255)`).
- **Phone field**:
  - Helper `normalizePhone` (copy dari ReviewFollowUpPanel) untuk cek validitas.
  - Badge hijau **"✓ Terverifikasi"** kalau `phoneVerified=true` dan phone tidak diubah.
  - Kalau diubah → badge reset, tampil tombol **"Verifikasi via WA"** (disabled bila nomor invalid).
  - Klik tombol → invoke `admin-user-ops` `verify_phone_wa`. Sukses → set `phoneVerified=true` + toast.
- **Save Changes**: setelah update profiles (existing logic), kalau `email !== initialEmail` → invoke `update_email`. Kalau gagal → toast tapi tetap simpan perubahan profile.
- Hapus field email & verifikasi dari panel ini saat customer null (guard).

### 3. `src/components/admin/CustomerList.tsx`
- Saat fetch list customers, tambah ambil `phone_verified` dari profiles.
- Saat open EditCustomerDialog, oper `email` (sudah ada di emailMap) dan `phone_verified`.

### 4. Tidak diubah
- Schema database (`profiles.phone_verified`, `phone_verified_at` sudah ada).
- `attach-referrer` & rule fraud lain tetap berfungsi (verifikasi manual ini tetap mengisi `phone_verified=true` yang dipakai uniqueness check di rule lain).

## File yang akan diubah
- `supabase/functions/admin-user-ops/index.ts` — 2 action baru.
- `src/components/admin/EditCustomerDialog.tsx` — UI email + verify WA.
- `src/components/admin/CustomerList.tsx` — pass `email` & `phone_verified` ke dialog.
