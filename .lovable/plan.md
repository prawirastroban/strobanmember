## Tujuan
Tambah 7 lapis proteksi anti-fraud (anti-tuyul) untuk sistem referral, dijalankan di level database via trigger & function (tidak bisa dibypass dari frontend).

## Catatan upfront
- Rule 7 (rate limiting): backend belum punya primitive rate-limit yang matang. Implementasi akan ad-hoc via tabel hitung counter per hari/bulan di trigger `attach_referrer` — fungsional, tapi bukan rate-limit kelas infrastruktur.
- Bonus signup yang sekarang langsung `available`. Akan diubah menjadi `pending` selama 7 hari.

---

## 1) Migrasi DB — kolom & tabel baru

### Tabel `profiles` (kolom tambahan)
- `signup_ip TEXT` — IP saat daftar (diisi via RPC `attach_referrer` / trigger).
- `fraud_score INTEGER NOT NULL DEFAULT 0`.
- `is_flagged BOOLEAN NOT NULL DEFAULT false`.
- `flagged_reason TEXT`.
- `flagged_at TIMESTAMPTZ`.
- `phone_verified BOOLEAN NOT NULL DEFAULT false`.
- `phone_verified_at TIMESTAMPTZ`.

### Tabel `referral_settings` (kolom tambahan)
- `signup_bonus_hold_days INTEGER NOT NULL DEFAULT 7`.
- `max_referrals_per_day INTEGER NOT NULL DEFAULT 10`.
- `max_referrals_per_month INTEGER NOT NULL DEFAULT 50`.
- `same_ip_threshold INTEGER NOT NULL DEFAULT 2` (lebih dari N akun/IP/24j → flag).
- `fraud_score_flag_threshold INTEGER NOT NULL DEFAULT 50`.

### Tabel baru `referral_fraud_log`
- `id, user_id, related_user_id, rule TEXT, score_delta INT, details JSONB, created_at`.
- RLS: hanya staff/admin bisa SELECT.

### Tabel baru `referral_signups_meta` (untuk dedup)
- `referee_id UUID PK, referrer_id UUID, signup_ip TEXT, signup_phone TEXT, created_at`.
- Index `(referrer_id, signup_ip, created_at)` & `(referrer_id, created_at)`.

### Index unik
- `profiles.phone` → UNIQUE partial WHERE phone IS NOT NULL (Rule 3).
- `referral_withdrawals` perlu kolom `bank_account_number` & UNIQUE per `user_id` (Rule 5) — atau profile-level `payout_bank_account` UNIQUE.

---

## 2) Implementasi rule (function/trigger)

### Rule 1 — Komisi booking saat **completed**, bukan paid
- Modifikasi `award_referral_booking_commission()`:
  - Trigger pada `UPDATE` ketika `service_status` berubah ke `completed` (bukan `payment_status='paid'`).
  - Jika booking di-cancel kapan pun → komisi `cancelled` (sudah ada, tetap dipertahankan).

### Rule 2 — Bonus signup ditahan 7 hari
- Modifikasi `award_referral_signup_bonus()`:
  - Insert komisi signup dengan `status='pending'`, `available_at = now() + signup_bonus_hold_days * interval '1 day'`.
- Tambah scheduled function `release_pending_referral_commissions()` (dipanggil via Edge cron harian) yang `UPDATE ... SET status='available' WHERE status='pending' AND available_at <= now()` — hanya jika referrer/referee tidak `is_flagged`.

### Rule 3 — Nomor HP unik & terverifikasi
- UNIQUE index pada `profiles.phone`.
- Modifikasi `attach_referrer` & `award_referral_signup_bonus`:
  - Tolak / skip bonus jika referee `phone_verified = false`.
- Untuk OTP: pakai Supabase Auth phone OTP yang sudah ada; trigger `on_auth_phone_confirmed` set `profiles.phone_verified = true`. (Jika OTP belum aktif: minta user enable `cloud--configure_auth` phone provider — ditandai sebagai dependency dalam plan.)

### Rule 4 — Deteksi IP duplikat
- RPC `attach_referrer(_code, _ip TEXT)` diperluas terima IP (dari edge function/proxy header). Frontend kirim via `supabase.functions.invoke('attach-referrer', { body: { code, ip } })` — atau RPC dipanggil dari edge function yang baca `x-forwarded-for`.
- Insert ke `referral_signups_meta`.
- Hitung `COUNT(*) FROM referral_signups_meta WHERE referrer_id = v_referrer AND signup_ip = _ip AND created_at > now() - interval '24h'`.
- Jika `> same_ip_threshold` → tambah `fraud_score += 30` ke referrer + log ke `referral_fraud_log`. Jika `>= fraud_score_flag_threshold` → set `is_flagged = true`, semua komisi `pending`/`available` referrer → `pending` (hold).

### Rule 5 — Rekening bank unik per akun
- Saat `referral_withdrawals` insert (atau profile update payout): UNIQUE constraint `(bank_account_number)` partial. Trigger `BEFORE INSERT` cek apakah nomor rekening sudah dipakai user_id lain → RAISE EXCEPTION + tambah fraud_score.

### Rule 6 — Fraud score system
- Helper `add_fraud_score(_user_id UUID, _delta INT, _rule TEXT, _details JSONB)`:
  - UPDATE `profiles.fraud_score += _delta`.
  - INSERT `referral_fraud_log`.
  - Jika `fraud_score >= threshold`: set `is_flagged=true`, hold komisi (`UPDATE referral_commissions SET status='pending' WHERE referrer_id=_user_id AND status='available'`), insert notification ke semua staff.
- Dipanggil dari Rule 3,4,5,7.

### Rule 7 — Rate limiting referral
- Di `attach_referrer`: hitung `referral_signups_meta` untuk `v_referrer`:
  - `>= max_referrals_per_day` dalam 24 jam → return error + `add_fraud_score(+20, 'rate_day')`.
  - `>= max_referrals_per_month` dalam 30 hari → return error + `add_fraud_score(+10, 'rate_month')`.

---

## 3) Edge Function baru `attach-referrer`
- Karena `attach_referrer` butuh IP (Rule 4), bungkus RPC dalam edge function:
  - Baca `req.headers.get('x-forwarded-for')`.
  - Auth user via JWT.
  - Panggil RPC `attach_referrer(_code, _ip)` dengan service role.
- Frontend (`AuthCallback.tsx`, `Referral.tsx`, `Auth.tsx`) ganti `supabase.rpc('attach_referrer'...)` → `supabase.functions.invoke('attach-referrer', { body: { code } })`.

---

## 4) Admin UI — `ReferralManager.tsx`
- Tab/section baru **"Anti-Fraud"**:
  - List akun dengan `is_flagged=true` atau `fraud_score >= 30` — kolom: nama, score, rule terakhir, jumlah signup 24j, action: **Unflag / Block / Approve pending**.
  - Tabel `referral_fraud_log` (filter per user, per rule).
- Form `ReferralSettings`: tambah field 5 kolom baru (hold_days, rate per day/month, same_ip_threshold, fraud_score_flag_threshold).

---

## 5) Customer UI
- `Profile.tsx`: tampilkan badge "HP terverifikasi" + tombol **Verifikasi via OTP** jika belum.
- `Referral.tsx`: jika user `is_flagged` → banner peringatan "Akun sedang ditinjau, komisi ditahan sementara. Hubungi support."

---

## Out-of-scope
- Device fingerprinting (browser-based).
- KYC dokumen (KTP/selfie).
- Manual review workflow lengkap (cukup flag + unflag dulu).
- Pengaturan whitelist IP (kantor/karyawan).

---

## Detail teknis (untuk dev)
- Semua `add_fraud_score` & trigger pakai `SECURITY DEFINER` + `SET search_path = public`.
- Migrasi backfill: `phone_verified=true` untuk profile lama yang sudah punya phone (agar tidak break user existing) — atau biarkan default false, beri grace banner.
- Cron release pending bonus: pakai pg_cron extension jika tersedia, atau Supabase scheduled edge function harian (`release-pending-referral-commissions`).
- Komisi yang sudah `paid` tidak terpengaruh re-flag.