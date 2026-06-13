## Customer & Vehicle Auto-Verification Flow

### Tujuan
Hapus hambatan verifikasi manual agar customer baru bisa langsung booking, sambil tetap menjaga kualitas data CRM (no duplicate, WA valid, sumber registrasi tercatat).

---

### 1. Database changes (1 migration)

**`profiles`**
- Default `is_verified = true` (sebelumnya `false`).
- Backfill: `UPDATE profiles SET is_verified = true WHERE is_verified = false`.
- Tambah kolom `registration_source TEXT` — enum-like: `google | email | whatsapp | referral | promo | direct`.
- Tambah index unik **case-insensitive** pada `phone` (normalized digits) dan pada `email` (existing di auth.users, tapi tambahkan validasi di profile trigger).

**`vehicles`**
- Default `is_verified = true` (jika kolom ada). Backfill semua existing → verified.
- Tambah unique index pada `UPPER(license_plate)` untuk deteksi duplikat plat.

**Trigger `handle_new_user`**
- Set `is_verified = true`.
- Set `registration_source` dari `raw_user_meta_data->>'registration_source'` (fallback `direct`).
- Jika `provider = google` → `google`; jika email synthetic phone → `whatsapp`; else `email`.

**Hapus gating verifikasi**
- Drop policy RLS yang membatasi akses transaksi berdasarkan `is_verified = false` (booking, payments). Booking sekarang hanya butuh `auth.uid()` valid.

---

### 2. Frontend changes

**`src/contexts/AuthContext.tsx`**
- Hapus blok yang `signOut()` ketika `is_verified = false` di `signIn()`. Akun langsung aktif.

**`src/pages/Auth.tsx`**
- Saat signUp email / phone / Google, kirim `registration_source` ke `options.data`.
- Tetap wajib salah satu dari: Google / Email / Phone.
- Validasi nomor HP Indonesia (`+62`, min 10 digit) menggunakan helper `normalizePhoneDigits` + cek panjang 10–14.
- Hapus pesan "Akun belum diverifikasi, hubungi admin".

**`signup-precheck` edge function**
- Tambah pengecekan: nomor HP sudah dipakai? → return `{ ok:false, reason:'duplicate_phone' }`.
- Tetap cek IP & email.

**Add Vehicle (`AddVehicleDialog`, `MyVehicles`)**
- Sebelum insert, query `vehicles` by `UPPER(license_plate)`:
  - Jika milik user lain → toast peringatan "Plat sudah terdaftar atas customer lain. Hubungi admin."
  - Jika milik user sendiri → toast "Kendaraan ini sudah ada di akun Anda."
- Set `is_verified = true` saat insert.

**`useUserVerification` / `WhatsAppRequiredGate`**
- `useUserVerification` tetap berfungsi tapi default true.
- `WhatsAppRequiredGate` tetap memaksa user melengkapi WA jika kosong (karena WA jadi prioritas data utama).

**Customer Management UI (`/dashboard/customers`)**
- Tambah kolom **Source** (badge: Google/Email/WA/Referral/Promo/Direct).
- Filter sumber registrasi.
- Hapus action "Verify User" (otomatis verified). Tetap simpan "Revoke verification" untuk admin sebagai tindakan khusus.

---

### 3. Profile data minimum (UI Profile.tsx)
- Wajib: Nama, Nomor WA. Email auto dari provider.
- Opsional: Tanggal Lahir, Jenis Kelamin, Kota, Alamat.
- Field kendaraan minimum: Plat, Merek, Model, Tahun. Opsional: VIN, No Mesin, Warna, KM.

---

### 4. Reports
- Pastikan `registration_source` muncul di:
  - Customer report (Reports Hub)
  - Acquisition report (baru: group by source)
  - Loyalty & Referral export tetap menyertakan kolom Source.

---

### Out of scope
- Tidak mengubah role/admin permission.
- Tidak mengubah Midtrans / payment flow.
- Tidak hapus `is_verified` column — hanya default ke true + hapus gating.

---

### Hasil akhir
- Daftar (Google/Email/WA) → langsung verified → tambah kendaraan → langsung booking. Nol approval. Duplicate phone/email/plat ditolak di precheck. Source tercatat di setiap akun.
