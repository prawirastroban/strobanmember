---
name: Kode Referral di Checkout
description: Referee memakai kode undangan (REF-xxxxxx) di kolom Kode Penukaran untuk diskon; referrer dapat komisi otomatis
type: feature
---

- Kode `REF-XXXXXX` = kode undangan milik akun (profiles.referral_code). Kode `REFV-...` = voucher hasil tukar saldo referral.
- Di checkout, `RedemptionCodeInput.tsx` mencoba berurutan: reward_redemptions → promo_claims → referral_vouchers → RPC `validate_referral_code_for_checkout(_code, _subtotal)`.
- Diterapkan sebagai redemption `source: "referral_code"`. Setelah booking tersimpan, `Booking.tsx` & `MobileBookingWizard.tsx` memanggil RPC `redeem_referral_code(_code, _booking_id)` yang mengisi `profiles.referred_by`.
- Syarat: program referral aktif & dalam periode, diskon referee diaktifkan, akun belum punya pengundang, bukan kode sendiri, referrer verified & tidak flagged, minimal transaksi terpenuhi.
- Komisi referrer tetap lewat trigger `award_referral_booking_commission` saat servis completed + paid.
- Pengaturan admin: Keuangan → Referral → Pengaturan → panel "Diskon Kode Undangan (Referee)"; kolom di `referral_settings`: `referee_discount_enabled`, `referee_discount_type`, `referee_discount_value`, `referee_discount_max`, `referee_min_purchase`.
