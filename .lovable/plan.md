# Sistem Referral & Komisi

## Tujuan
Setiap user terverifikasi (login Google) otomatis mendapat **kode referral unik**. Saat orang lain mendaftar & melakukan booking lewat kode tersebut, referrer dapat **komisi otomatis** yang bisa dicairkan ke rekening atau ditukar jadi diskon service (untuk diri sendiri / siapa saja).

---

## 1. Alur Pengguna

**Referrer (yang merekomendasikan)**
1. Setelah verifikasi (Google = otomatis), dapat kode `REF-XXXXXX` + link `bengkelstroban.com/?ref=REF-XXXXXX`.
2. Halaman baru `/referral`: lihat saldo komisi, total referee, riwayat, tombol bagikan (WA/Copy/QR), tombol Tarik Tunai / Tukar Voucher.
3. Notifikasi tiap kali dapat komisi.

**Referee (yang direkomendasikan)**
1. Klik link → kode tersimpan di `localStorage` (`pending_ref_code`).
2. Saat sign-up Google selesai → kode di-attach ke profile (`referred_by`).
3. Begitu **booking pertama lunas (paid)** → komisi referrer tercipta.

**Pencairan**
- **Tarik tunai**: input bank + no rekening + nominal (≥ minimum). Status: `pending` → admin transfer → `paid`.
- **Tukar voucher**: konversi saldo → kode voucher diskon (bisa dipakai diri sendiri atau diberikan ke siapa saja saat booking).

---

## 2. Panel Admin Baru

Route: `/dashboard/keuangan/referral` — **staff-only** (`OwnerOnly`).

Tab-tab:
- **Pengaturan Komisi**: nominal bonus saat referee terverifikasi (default Rp 10.000), persentase komisi tiap booking lunas (default 5%), minimum withdraw, rasio konversi voucher (mis. 1:1), aktif/non-aktif.
- **Daftar Komisi**: semua entry komisi (referrer, referee, booking, jumlah, status `pending|available|paid`).
- **Permintaan Pencairan**: list withdraw request → tombol Approve (mark paid + simpan bukti transfer) / Reject (kembalikan saldo).
- **Voucher Referral**: voucher hasil tukar saldo, status pakai.
- **Top Referrer**: leaderboard.

Sidebar: tambahkan menu "Referral & Komisi" di group Keuangan (visible staff only).

---

## 3. Skema Database (migration baru)

```text
referral_settings (single row, id=1)
  - signup_bonus (numeric)        default 10000
  - booking_commission_pct (num)  default 5
  - min_withdraw (numeric)        default 50000
  - voucher_conversion_rate (num) default 1.0
  - is_active (bool)              default true

profiles  (kolom tambahan)
  - referral_code text unique     (auto-generate REF-XXXXXX saat verifikasi)
  - referred_by uuid              (id user referrer)

referral_commissions
  - id, referrer_id, referee_id, booking_id (nullable)
  - type ('signup' | 'booking')
  - amount numeric
  - status ('pending'|'available'|'paid'|'cancelled')
  - created_at, available_at

referral_balances
  - user_id (PK), available_balance, pending_balance, total_earned, total_withdrawn

referral_withdrawals
  - id, user_id, amount, bank_name, account_number, account_holder
  - status ('pending'|'approved'|'rejected'|'paid')
  - admin_note, proof_url, processed_by, processed_at

referral_vouchers
  - id, user_id, code (REFV-XXXXXX), amount, status, expires_at, used_at, used_by
```

**RLS**:
- `referral_settings`: anyone read; staff-only write.
- `referral_commissions` / `referral_balances` / `referral_withdrawals` / `referral_vouchers`: user read milik sendiri; staff full; admin_cabang none.

**Triggers / Functions (SECURITY DEFINER)**:
- `assign_referral_code()` – generate kode saat profile `is_verified` = true.
- `attach_referrer(_code)` – RPC dipanggil saat user baru selesai sign-in (validasi: tidak self, belum punya referrer).
- `award_signup_commission` – trigger di `profiles`: saat `is_verified` true & `referred_by` not null → buat commission `signup`.
- `award_booking_commission` – trigger di `bookings`: saat `payment_status` jadi `paid` → buat commission `booking` = `service_price * pct%`.
- `update_referral_balance` – trigger insert/update `referral_commissions` → update `referral_balances`.
- `request_withdrawal(_amount, _bank, _no, _holder)` – validasi saldo ≥ min, lock balance.
- `approve_withdrawal / reject_withdrawal / mark_paid_withdrawal` – staff RPC.
- `convert_to_voucher(_amount)` – kurangi saldo, buat voucher REFV-XXXXXX.
- `redeem_referral_voucher(_code, _booking_id)` – pakai saat booking (potong harga).

Voucher dipakai di alur booking baru: `BookingForm` & `MobileBookingWizard` → input "Kode voucher referral" (mirip `RedemptionCodeInput` yang sudah ada).

---

## 4. UI yang Ditambahkan / Disentuh

**Baru**
- `src/pages/Referral.tsx` – dashboard customer (saldo, share, history, withdraw/voucher).
- `src/components/admin/keuangan/ReferralSettingsManager.tsx` – panel staff dengan 5 tab di atas.
- `src/components/booking/ReferralVoucherInput.tsx` – kotak input kode voucher referral di booking.

**Diubah**
- `src/App.tsx` – route `/referral` (protected) + `/dashboard/keuangan/referral` (OwnerOnly) di `Admin.tsx`.
- `src/components/admin/AdminSidebar.tsx` – item "Referral & Komisi" di group Keuangan (staff only).
- `AuthCallback.tsx` / `Auth.tsx` – baca `localStorage.pending_ref_code` lalu panggil `attach_referrer` setelah sukses login.
- `Index.tsx` (atau hook root) – kalau URL ada `?ref=...`, simpan ke `localStorage`.
- `Profile.tsx` & menu profil – tombol "Program Referral" → `/referral`.
- Booking flow – integrasi `ReferralVoucherInput` (potong `service_price` final).

---

## 5. Aturan Bisnis Penting

- Referrer harus **terverifikasi** (Google signup). User non-verified tidak punya kode.
- Referee tidak bisa pakai kode dirinya sendiri.
- Komisi `booking` baru **available** saat `payment_status='paid'` (bukan saat completed) — sesuai pilihan Anda.
- Jika booking dibatalkan/refund setelah paid → status komisi → `cancelled` & saldo dipotong (handled by trigger).
- Withdraw minimum diatur di settings (default Rp 50.000).
- Voucher referral berlaku 90 hari (configurable nanti), 1x pakai per booking.
- Semua aktivitas masuk `activity_logs` (type `referral`).

---

## 6. Visual / Style

Mengikuti memory: liquid glass, accent `#ff2b2b`, KPI cards mirip `dashboard-analytics`, format Rupiah `Rp 150.000`, bahasa Indonesia.
