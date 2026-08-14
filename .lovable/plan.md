# Penerapan Minimal Transaksi Promo di Checkout

## Kondisi saat ini

Kolom **Min. Transaksi (Rp)** sudah ada di form promo dan tersimpan di kolom `min_purchase`. Nilainya hanya ditampilkan sebagai informasi di halaman `/promo`, dan sudah dipakai untuk memfilter daftar promo di katalog. Namun saat voucher promo dipakai di halaman Booking / Wizard Mobile, nilai ini tidak pernah diambil maupun diperiksa — jadi voucher tetap bisa dipakai walau transaksi di bawah minimal.

## Aturan yang akan diterapkan

- Dasar perhitungan = **total harga layanan yang termasuk cakupan promo saja** (sesuai kuantitas).
  - Promo dibatasi layanan spesifik -> jumlahkan hanya layanan tersebut.
  - Promo dibatasi kategori -> jumlahkan layanan pada kategori tersebut.
  - Promo tanpa batasan -> jumlahkan seluruh layanan di keranjang.
- Jika total tersebut lebih kecil dari **Min. Transaksi**, voucher tidak bisa dipakai.

## Perubahan perilaku di checkout

1. Voucher yang belum memenuhi minimal masuk ke daftar "belum memenuhi syarat", dengan keterangan jelas:
   "Minimal transaksi Rp 300.000 — kurang Rp 120.000."
2. Voucher tidak akan dipilih otomatis bila belum memenuhi minimal.
3. Bila pelanggan mengurangi layanan sehingga total turun di bawah minimal, voucher yang sudah terpasang dilepas otomatis disertai pemberitahuan.
4. Saat kode voucher diketik manual, muncul pesan penolakan yang sama, bukan diterima diam-diam.
5. Halaman `/promo` tetap menampilkan informasi minimal transaksi seperti sekarang.

## Catatan teknis

- `RedemptionCodeInput` menerima prop baru berisi rincian layanan terpilih (id, kategori, harga, qty) selain daftar id/kategori yang sudah ada; dikirim dari `src/pages/Booking.tsx` dan `src/components/booking/MobileBookingWizard.tsx`.
- Query promo di `RedemptionCodeInput` menambahkan kolom `min_purchase` (untuk promo dari `promo_claims`); voucher referral dan reward tukar poin tidak punya minimal sehingga selalu lolos pemeriksaan ini.
- Helper baru `eligibleAmountFor(scope, items)` dan `meetsMinPurchase(...)` ditambahkan ke `src/lib/promoEligibility.ts` agar dipakai konsisten oleh daftar voucher, auto-apply, dan validasi kode manual.
- Tidak ada perubahan skema database; kolom `min_purchase` sudah tersedia.
