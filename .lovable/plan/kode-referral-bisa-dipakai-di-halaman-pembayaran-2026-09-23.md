# Kode Referral Bisa Dipakai di Halaman Pembayaran

## Kenapa sekarang gagal

Kode seperti `REF-C10315` adalah **kode undangan milik akun lain**, sementara kolom "Kode Penukaran" di halaman pembayaran hanya menerima voucher hadiah, voucher promo, dan voucher hasil tukar saldo referral (`REFV-...`). Karena itu muncul pesan "Kode penukaran tidak valid atau kadaluarsa".

Terverifikasi di data: `REF-C10315` memang milik akun "DIGITAL MARKETING DIVISION STROBAN AUTO", tabel voucher referral masih kosong, dan baru 1 akun yang punya pengundang.

## Cara kerja baru

1. Pelanggan (referee) memasukkan kode undangan temannya di halaman pembayaran.
2. Sistem memeriksa: kode ada, bukan kode sendiri, program referral aktif & dalam periode, dan **akun belum punya pengundang**.
3. Jika lolos: pelanggan langsung mendapat **diskon khusus referee** (nilainya diatur admin), dan akunnya tercatat diundang oleh pemilik kode.
4. Saat servis pelanggan tersebut selesai & lunas, pemilik kode (referrer) otomatis mendapat komisi — memakai mekanisme komisi yang sudah ada.
5. Satu akun hanya bisa memakai satu kode undangan, sekali seumur akun.

## Pengaturan admin (Keuangan → Referral)

Panel baru "Diskon Referee":
- Aktif / nonaktif
- Jenis diskon: persen atau nominal rupiah
- Nilai diskon
- Batas maksimum potongan (untuk tipe persen)
- Minimal transaksi agar diskon berlaku

Komisi referrer tetap memakai pengaturan persentase komisi booking yang sudah ada.

## Pesan yang jelas untuk pelanggan

- "Kode undangan tidak ditemukan."
- "Anda tidak bisa memakai kode undangan sendiri."
- "Akun Anda sudah pernah memakai kode undangan."
- "Minimal transaksi Rp X untuk memakai kode undangan ini."
- "Program referral sedang tidak aktif."

## Catatan teknis

**Database**
- Tambah kolom di `referral_settings`: `referee_discount_enabled` (bool, default false), `referee_discount_type` (text, default `percentage`), `referee_discount_value` (numeric, default 0), `referee_discount_max` (numeric, nullable), `referee_min_purchase` (numeric, default 0).
- RPC baru `validate_referral_code_for_checkout(_code text, _subtotal numeric)` — SECURITY DEFINER, read-only, mengembalikan `{ valid, error, referrer_id, discount_type, discount_value, discount_amount }`. Dipakai saat tombol "Terapkan" ditekan, sehingga tidak ada perubahan data sebelum booking benar-benar dibuat.
- RPC baru `redeem_referral_code(_code text, _booking_id uuid)` — SECURITY DEFINER, dipanggil setelah booking tersimpan: memvalidasi ulang, mengisi `profiles.referred_by` (hanya jika masih NULL), dan mencatat pemakaian. Bonus signup & komisi booking mengalir lewat trigger `award_referral_signup_bonus` dan `award_referral_booking_commission` yang sudah ada.
- Pemeriksaan anti-kecurangan yang sudah ada (IP duplikat via `assert_signup_ip_unique`, `add_fraud_score`) dipanggil ulang di dalam `redeem_referral_code`.

**Frontend**
- `src/components/booking/RedemptionCodeInput.tsx`: pada `validateCode`, jika kode berpola `REF-` (bukan `REFV-`) dan tidak cocok sebagai voucher, panggil RPC validasi referral, lalu terapkan sebagai redemption dengan `source: "referral_code"` dan `discount_type/value` dari server.
- `src/pages/Booking.tsx` dan `src/components/booking/MobileBookingWizard.tsx`: setelah booking dibuat, jika redemption bersumber `referral_code`, panggil `redeem_referral_code`; jika server menolak, booking tetap jalan tanpa diskon disertai pemberitahuan.
- `src/components/admin/keuangan/ReferralManager.tsx`: tambahkan panel pengaturan "Diskon Referee" dan simpan bersama pengaturan referral lain.
- `src/pages/Referral.tsx`: tambahkan keterangan bahwa kode bisa langsung dipakai penerima undangan di halaman pembayaran.
