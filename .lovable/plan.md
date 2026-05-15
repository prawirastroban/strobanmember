## Reset Data Transaksi untuk Launching

Tujuan: hapus semua data transaksi & riwayat aktivitas pelanggan, **tanpa menyentuh akun user, role, cabang, layanan, ban, promo, branding, dan pengaturan**.

### ✅ Yang DIPERTAHANKAN (tidak disentuh sama sekali)
- `auth.users` — semua akun login
- `profiles` — termasuk `customer_id`, `referral_code`, `is_verified`, `assigned_branch`
- `user_roles` — role admin / staff / admin_cabang / user
- `branches`, `services`, `service_categories`, `tires`, `promos`
- `app_branding`, `app_settings`, `legal_documents`, `referral_settings`
- `manual_payment_accounts`, `manual_payment_qris` (master rekening / QRIS)
- `booking_slots` (master slot)
- `push_tokens` (supaya notifikasi tetap jalan setelah launch)
- `my_vehicles` (kendaraan milik pelanggan)

### 🗑 Yang AKAN DIHAPUS (semua baris)
Urutan dirancang aman terhadap dependensi logis (anak → induk):

1. `booking_status_logs` — log perubahan status booking
2. `booking_reviews` — review pelanggan
3. `manual_payment_proofs` — bukti transfer/QRIS
4. `payments` — record pembayaran
5. `invoices` — invoice
6. `promo_claims` — klaim voucher promo
7. `referral_commissions` — komisi referral
8. `referral_vouchers` — voucher hasil konversi
9. `referral_withdrawals` — pengajuan tarik dana
10. `loyalty_transactions` — riwayat poin
11. `notifications` — semua notifikasi user
12. `activity_logs` — log aktivitas
13. `admin_audit_log` — audit trail admin
14. `customer_complaints` — keluhan pelanggan
15. `bookings` — booking utama (dihapus terakhir)

### 🔄 Yang AKAN DI-RESET (bukan dihapus)
- `referral_balances` → set semua kolom saldo ke `0`
- `loyalty_points` → set `total_points = 0`
- `promos.claims_count` → set ke `0`

### ⚙ Cara eksekusi
Saya jalankan dalam **satu transaksi SQL** lewat tool data-mutation. Jika ada satu error, semua di-rollback (aman).

### ⚠ Catatan penting sebelum eksekusi
- Aksi ini **tidak bisa di-undo lewat tombol revert** karena ini perubahan data, bukan kode.
- Pastikan tidak ada staff sedang memproses booking saat ini.
- Setelah eksekusi: invoice akan mulai dari `INV-000001` lagi (counter berbasis baris terakhir, jadi otomatis reset).

### Konfirmasi yang saya butuhkan
Mohon balas **"YA, lanjutkan"** untuk mulai eksekusi, atau koreksi daftar di atas (mis. ingin tetap menyimpan keluhan / review lama, dll).
