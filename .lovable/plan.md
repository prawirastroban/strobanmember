## Tujuan

1. **Gambar 2 – Form "New Customer" di Quick Booking**
   - Saat ini: Name + Email wajib, Phone opsional.
   - Setelah revisi: **Name + WhatsApp wajib**, Email opsional (auto-generated dari nomor HP bila kosong).
   - Alasan: link aktivasi & link tracking dikirim via WA, jadi nomor HP adalah identitas utama.

2. **Gambar 1 – Link Klaim Akun tidak muncul**
   - Penyebab: kartu konfirmasi hanya menampilkan link klaim jika `selectedCustomer.is_new === true` (artinya benar-benar baru dibuat detik itu juga). Saat customer "tesssss" dipakai ulang / sudah ada di DB, sistem fallback ke link tracking publik `/t/<token>` — itulah halaman "Lacak Servis Anda" pada screenshot.
   - Setelah revisi: kartu konfirmasi tetap bisa **menerbitkan link klaim 1x pakai** untuk customer existing yang **belum pernah set password** (acquisition_source = `staff_created` atau email synthetic `@phone.bengkelstroban.com` dan belum verified).

---

## Perubahan

### A. Form "New Customer" (`InlineAddCustomer`)
Berlaku di kedua dialog: `src/components/admin/StaffQuickBookingDialog.tsx` dan `src/components/admin/QuickBookingDialog.tsx`.

- Field wajib: **Name**, **WhatsApp** (dengan prefix `+62`, validasi minimal 9 digit setelah 62).
- Field opsional: **Email** (placeholder: "Opsional — otomatis dibuat dari nomor HP").
- Validasi:
  - WhatsApp dinormalisasi via `normalizePhoneDigits` (helper `src/lib/phoneEmail.ts`).
  - Jika Email kosong → kirim `phoneToEmail(phone)` ke edge function `admin-user-ops`.
  - Jika nomor sudah dipakai akun lain → tampilkan error dari edge function apa adanya.
- Label & placeholder dalam Bahasa Indonesia.

### B. Kartu Konfirmasi (`BookingShareCard`)
- Tambah tombol **"Terbitkan Link Aktivasi"** (muncul hanya jika `isNewUser=false` tapi backend mengonfirmasi akun customer belum punya password / belum verified).
- Saat diklik → panggil `admin-user-ops` action `issue_claim_token` → ganti tampilan kartu jadi mode `isClaim` (link aktivasi 1x pakai + pesan WA aktivasi).
- Jika akun customer sudah aktif (sudah pernah login / sudah set password), tombol disembunyikan & hanya tampilkan link tracking seperti sekarang.

### C. Edge Function `admin-user-ops`
File: `supabase/functions/admin-user-ops/index.ts`.

- Action `create_customer`:
  - Terima `phone` wajib; jika `email` kosong → derive `phoneToEmail(phone)`.
  - Cek duplikasi by phone (profiles.phone) selain by email.
- Action `issue_claim_token`:
  - Tambah guard: izinkan diterbitkan untuk user yang **belum aktif** (kriteria: `acquisition_source='staff_created'` ATAU `email` ber-domain `@phone.bengkelstroban.com` ATAU `last_sign_in_at IS NULL`).
  - Jika user sudah aktif → return `{ error: "Customer sudah memiliki akun aktif" }` agar tombol di UI menampilkan toast.
  - Tetap simpan token ke `account_claim_tokens` (single use, 14 hari) — tabel sudah ada.

### D. Indikator "Customer Baru" di Step 1
Saat memilih customer dari hasil pencarian, jika profile terdeteksi `staff_created` & belum aktif, tampilkan badge kecil "Belum Aktif" — supaya admin tahu link yang akan muncul nanti adalah link aktivasi.

---

## Detail Teknis

- Helper yang dipakai ulang: `normalizePhoneDigits`, `toE164`, `phoneToEmail` dari `src/lib/phoneEmail.ts` (sudah ada).
- Status "belum aktif" ditentukan server-side di `issue_claim_token` via `auth.admin.getUserById` (cek `last_sign_in_at`) + `profiles.acquisition_source`. Tidak perlu migrasi DB baru.
- Tabel `account_claim_tokens` & route `/claim/:token` sudah lengkap — tidak ada perubahan.
- Tidak menyentuh flow customer self-booking, tidak menyentuh `MobileBookingWizard`.

---

## File yang diubah

- `src/components/admin/StaffQuickBookingDialog.tsx` — form add customer + badge "Belum Aktif".
- `src/components/admin/QuickBookingDialog.tsx` — form add customer (sinkron).
- `src/components/admin/BookingShareCard.tsx` — tombol "Terbitkan Link Aktivasi".
- `supabase/functions/admin-user-ops/index.ts` — phone wajib + guard issue_claim_token.

## Di luar scope

- Tidak mengubah desain halaman `/t/:token` (PublicBookingTracker).
- Tidak menambah pengiriman WA otomatis dari server (tetap admin yang klik tombol kirim).
- Tidak mengubah skema database.
