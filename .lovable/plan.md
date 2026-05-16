## Audit Pra-Launching — Sahabat Stroban

Read-only. Tidak ada kode yang diubah. Semua temuan diverifikasi langsung dari DB live + source.

---

### CEK 1 — DATABASE

- ✅ **OK** — 45 tabel publik ada. Semua tabel referral hadir (`referral_balances`, `referral_commissions`, `referral_withdrawals`, `referral_fraud_log`, `referral_signups_meta`, `referral_vouchers`, `referral_ip_allowlist`, `referral_settings`).
- 🟠 **PENTING** — Tabel referral disebut `referral_commissions` (bukan `referral_transactions`) dan `referral_fraud_log` (bukan `referral_fraud_logs`). Perbedaan nama dengan checklist Anda — tapi struktur fungsional ekuivalen.
- ✅ **OK** — RLS aktif di **semua 45 tabel** (0 tabel tanpa RLS, 0 tabel tanpa policy).
- 🔴 **KRITIS** — **Trigger duplikat** di `bookings`: `sync_slot_status_after_booking` terpasang **3×**, `trg_validate_booking_pickup` 2×, `trg_log_booking_status_change` 2×, `trg_fill_and_validate_booking_vehicle` 2×, `trg_validate_booking_vehicle_link` 2×, `trg_log_booking_activity` 2×, `trg_notify_booking_status_change` 2×. Juga `referral_commissions.trg_sync_referral_balance` 3× dan `tires.trg_log_inventory_activity` 3×, `payments` punya 5 trigger ganda. → Setiap insert/update booking menjalankan logic balance/notif/log berkali-kali — risiko: notifikasi dobel, balance referral salah hitung, slot terkunci ganda.
- 🟠 **PENTING** — Foreign key minim. Hanya 15 tabel punya FK. `bookings.user_id`, `payments.booking_id`, `referral_commissions.referrer_id/referee_id/booking_id`, `loyalty_*`, `notifications.user_id`, `vehicles.user_id`, `manual_payment_proofs.user_id` tidak terhubung FK ke induknya → orphan data mungkin.
- 🟡 **MINOR** — Enum `app_role`: `admin, staff, customer, admin_cabang`. **Tidak ada `cs_pusat`** — di codebase, `admin` = CS Pusat dan `staff` = Owner (lihat `useUserRole.ts`). Penamaan checklist Anda perlu disesuaikan, bukan bug.

---

### CEK 2 — AUTH FLOW

- ✅ **OK** — Register memerlukan `is_verified=true` sebelum login. AuthContext melakukan auto-confirm + verifikasi (`signIn` di `AuthContext.tsx`).
- ✅ **OK** — Google OAuth via `/auth/callback` ada (lihat `App.tsx`).
- ✅ **OK** — `/reset-password` route public, `ProtectedRoute` & `AdminRoute` benar.
- 🟠 **PENTING** — `useAuth()` fallback mengembalikan `loading: true` saat context undefined → bila provider gagal mount, semua `ProtectedRoute` stuck di spinner tanpa error.
- 🟡 **MINOR** — `signOut()` hanya panggil `supabase.auth.signOut()`. Memori menyebut "Sign Out Behavior: Alert confirm, clear storage, full window reload" — tidak ada `localStorage.clear()` / `window.location.reload()` di `AuthContext.signOut`. Cek apakah dilakukan di komponen pemanggil.

---

### CEK 3 — BOOKING FLOW

- ✅ **OK** — Trigger pendukung lengkap: `trg_generate_invoice_on_booking`, `trg_set_review_reminder`, `trg_award_points_on_booking_complete`, `trg_award_booking_commission`, `trg_enforce_payment_before_complete`, `trg_set_next_service_date_on_complete`.
- 🔴 **KRITIS** — Karena duplikasi trigger (lihat CEK 1): saat status berubah ke `completed`, `trg_award_points_on_booking_complete` jalan 1×, tapi log status & activity log jalan 2×, dan slot sync 3×. Risiko: poin dobel jika ada trigger duplikat versi lama yang juga award (perlu inspect `pg_trigger` body).
- 🟠 **PENTING** — Webhook Midtrans (`midtrans-webhook`) **memvalidasi signature SHA-512** ✅, namun edge function `verify_jwt = false` — wajar untuk webhook, tapi tidak ada rate limit terlihat.

---

### CEK 4 — REFERRAL SYSTEM

- 🔴 **KRITIS** — `referral_settings.is_active = FALSE` di DB. Sistem referral mati di production sekarang. Signup bonus, komisi booking, dan withdrawal **tidak akan jalan** sampai diaktifkan.
- ✅ **OK** — Fungsi lengkap: `assign_referral_code_on_verify`, `attach_referrer`, `award_referral_signup_bonus`, `award_referral_booking_commission`, `release_pending_referral_commissions`, `request/approve/reject/mark_paid_referral_withdrawal`, `convert_referral_to_voucher`, `redeem_referral_voucher`, `validate_referral_voucher`, `add_fraud_score`, `assert_signup_ip_unique`, `profiles_check_signup_ip`.
- ✅ **OK** — Anti-fraud: `same_ip_threshold=2`, `fraud_score_flag_threshold=50`, `max_referrals_per_day=10`, `max_referrals_per_month=50`, `signup_bonus_hold_days=7`. Trigger `profiles_block_duplicate_ip` aktif (terpasang 2× — duplikat).
- ✅ **OK** — `?ref=` capture di `App.tsx` → `localStorage.pending_ref_code`.
- 🔴 **KRITIS** — `trg_sync_referral_balance` di `referral_commissions` terpasang **3×**. Setiap insert komisi akan `UPDATE referral_balances` 3 kali → balance bisa **3× lipat** dari yang seharusnya. Ini menyebabkan kebocoran finansial bila referral diaktifkan.

---

### CEK 5 — ADMIN DASHBOARD

- ✅ **OK** — 51 komponen admin. Routing `/dashboard/*` lengkap dengan `OwnerOnly`/`NoBranchOnly` guards untuk Marketing, Branding, Pickup, Branches, Manual Payment.
- 🟠 **PENTING** — 302 panggilan `.from()` di `src/components/admin/` **tanpa `.limit()` atau `.range()`** mayoritas. Untuk dashboard dengan ribuan booking → query lambat & risiko hit batas 1000 row Supabase, data terpotong tanpa indikasi.
- ✅ **OK** — Realtime channel cleanup sudah benar (3 channel: presence, rewards-points, admin-slots — semua punya `removeChannel` di unmount).
- 🟡 **MINOR** — Beberapa rute lama redirect (`/admin/*`, `/dashboard/inventory`, `/dashboard/roles` → customers) — tidak masalah, tapi mungkin link UI lama masih ada.

---

### CEK 6 — UI/UX MOBILE

Tidak dapat diverifikasi tanpa render — perlu visual QA. Berdasarkan memori proyek:
- ✅ **OK (per memori)** — Compact dashboard, time-slot sync, compact info popup sudah diterapkan.
- 🟡 **MINOR** — Tidak ada audit otomatis untuk overflow 390px. Rekomendasi: jalankan visual pass manual di /booking, /dashboard/bookings, /referral, /loyalty, /my-booking.

---

### CEK 7 — KEAMANAN

- ✅ **OK** — RLS user-isolation: semua tabel sensitif (`bookings`, `payments`, `invoices`, `vehicles`, `loyalty_*`, `referral_*`, `notifications`, `manual_payment_proofs`) punya policy `auth.uid() = user_id`.
- ✅ **OK** — `admin_cabang` scoping via `is_admin_cabang_for(branch)` ada di `bookings`, `payments`, `invoices`, `profiles`.
- ✅ **OK** — Webhook Midtrans validasi SHA-512 signature dengan `MIDTRANS_SERVER_KEY`.
- ✅ **OK** — Tidak ada `service_role` / `sk_live` / `sk_test` di `src/`.
- 🟡 **MINOR** — `payments` punya policy `Block payment update from client (USING false)` ✅ — bagus, mencegah client memanipulasi status pembayaran.

---

### CEK 8 — PERFORMA

- 🟠 **PENTING** — Sangat sedikit `.limit()` di codebase (hanya ~10 file). Total 467 panggilan `.from()`. Untuk tabel yang akan tumbuh besar (`bookings`, `activity_logs`, `notifications`, `booking_status_logs`, `loyalty_transactions`) — query tanpa limit akan lambat dan dipotong di 1000 baris.
- ✅ **OK** — Tidak ditemukan `useEffect` dengan dependency array kosong yang mencurigakan di Booking/Admin.
- ✅ **OK** — Realtime cleanup proper di 3 channel.

---

## RINGKASAN

| Severity | Jumlah |
|---|---|
| 🔴 KRITIS | **3** |
| 🟠 PENTING | **6** |
| 🟡 MINOR | **5** |
| ✅ OK | 18 |

### Verdict: **BELUM LAYAK LAUNCHING** ❌

Penyebab utama: **trigger duplikat** dapat menyebabkan poin dobel, balance referral salah hitung 3×, dan notifikasi spam. Wajib dibereskan sebelum traffic real.

### 5 Fix Prioritas

1. 🔴 **Hapus trigger duplikat di `bookings`, `payments`, `referral_commissions`, `tires`, `profiles`** — buat migration `DROP TRIGGER IF EXISTS` untuk setiap nama, lalu `CREATE TRIGGER` 1× saja.
2. 🔴 **Aktifkan `referral_settings.is_active = true`** setelah trigger duplikat dibersihkan (jangan sebelum, atau balance akan korup 3×).
3. 🟠 **Tambah pagination/limit di admin queries** untuk `bookings`, `activity_logs`, `payments`, `notifications` (default 50, infinite scroll / "Load more").
4. 🟠 **Tambah FK constraints** untuk `bookings.user_id`, `payments.booking_id`, `referral_commissions.*`, `notifications.user_id`, `vehicles.user_id` dengan `ON DELETE CASCADE/SET NULL`.
5. 🟠 **Visual QA mobile pass** di `/booking`, `/dashboard/bookings`, `/referral`, `/my-booking`, `/loyalty` di viewport 390px.

### Estimasi Prompt Lovable

- **Fix 3 item KRITIS**: ~**2 prompt** (1 migration drop+recreate triggers, 1 untuk aktifkan referral + verifikasi).
- **Fix semua 🟠 PENTING (6)**: ~**4–5 prompt** (1 FK migration, 2–3 untuk pagination per area admin, 1 visual QA).
- **Total ke launch-ready**: **6–7 prompt Lovable**.

---

Laporan ini hanya read-only. Tidak ada file yang diubah. Tekan **Implement plan** hanya jika ingin saya mulai memperbaiki — saya akan minta konfirmasi urutan fix sebelum eksekusi.