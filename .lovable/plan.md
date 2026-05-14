## Masalah

Voucher hasil tukar poin di halaman `/referral` (kode `REFV-...`, tabel `referral_vouchers`) **tidak bisa dipakai** di form booking. `RedemptionCodeInput` hanya membaca dari `reward_redemptions` dan `promo_claims`, sedangkan voucher referral berada di tabel terpisah dan punya RPC sendiri (`validate_referral_voucher`, `redeem_referral_voucher`).

Akibatnya:
- Saat user input kode `REFV-XXXX` → muncul "Kode tidak valid".
- Voucher juga tidak ikut tampil di list "Voucher Tersedia" / rekomendasi otomatis.
- Diskon dari nominal voucher (Rp) tidak ikut memotong harga di ringkasan.

## Rencana Perbaikan

### 1. `src/components/booking/RedemptionCodeInput.tsx`
- Tambah sumber ketiga di `fetchAllCodes()`: query `referral_vouchers` dimana `user_id = userId`, `status = 'active'`, `expires_at > now()`. Map jadi `RedemptionData` dengan:
  - `redemption_code` = `code` (REFV-…)
  - `discount_type` = `"fixed"` (potongan Rupiah)
  - `discount_value` = `amount`
  - `reward_name` = `"Voucher Referral"`
  - `applicable_categories` / `applicable_service_ids` = `[]` (berlaku semua layanan)
  - `source` = `"referral"` (perluas union type)
- Tambah cabang validasi manual di `validateCode()` untuk kode berawalan `REFV` (atau fallback ketiga setelah reward & promo): query langsung tabel `referral_vouchers` dengan `code = upper`, `user_id = userId`, `status = 'active'`, lalu cek `expires_at`.
- Format diskon Rupiah di tampilan applied (`Rp 50.000 off`) — saat ini cabang non-percentage masih pakai `$`. Perbaiki agar konsisten Rupiah `id-ID`.

### 2. Konsumsi voucher saat booking dibuat
Dua tempat yang menandai voucher "used":
- `src/pages/Booking.tsx` (sekitar baris 390)
- `src/components/booking/MobileBookingWizard.tsx` (sekitar baris 328)

Tambah cabang berdasarkan `appliedRedemption.source`:
- `"reward"` → tetap update `reward_redemptions` (existing).
- `"promo"` → update `promo_claims.status = 'used'`, `used_at = now()` (saat ini belum ada — sekalian dibetulkan supaya promo claim tidak bisa dipakai dua kali).
- `"referral"` → panggil RPC `redeem_referral_voucher({ _booking_id: booking.id, _code: appliedRedemption.redemption_code })` agar konsisten dengan logic server (RPC akan set `status='used'`, `used_at`, `used_by`, `used_booking_id`).

### 3. Perhitungan diskon
`useMemo` perhitungan diskon di `Booking.tsx` & `MobileBookingWizard.tsx` sudah menangani `discount_type !== "percentage"` sebagai potongan nominal (`Math.min(value, original)`), jadi voucher referral akan otomatis memotong harga begitu source ketiga didukung — tidak perlu perubahan logika.

### 4. QA manual
- Tukar poin di `/referral` → dapat kode `REFV-...`.
- Buka form booking, pilih layanan apa saja:
  - Voucher REFV muncul di list "Voucher Tersedia" dan kandidat auto-apply.
  - Input manual `REFV-...` tervalidasi.
  - Total terpotong sebesar nominal voucher.
- Setelah submit booking → cek tabel `referral_vouchers` row terkait `status='used'`, `used_booking_id` terisi.

## Catatan teknis
- Tidak butuh migrasi DB — RPC `validate_referral_voucher` & `redeem_referral_voucher` sudah ada.
- Tidak ada perubahan UI besar selain label diskon Rupiah.
