---
name: Aturan Pemakaian Saldo Cashback
description: Pengaturan global (Owner) untuk membatasi layanan/kategori & batas nominal pemakaian saldo cashback di checkout
type: feature
---
Konfigurasi global disimpan sebagai JSON di `app_settings` key `cashback.usage_rules`: `enabled`, `mode` (`all|categories|services`), `allowed_categories[]` (slug), `allowed_service_ids[]`, `exclude_products`, `min_transaction`, `max_amount`, `max_percent`, `denied_message`. Mode `services` mengalahkan kategori (sejalan dengan aturan promo).

- Admin UI: `src/components/admin/CashbackRulesManager.tsx` → route Owner `/dashboard/marketing/cashback-rules` (menu Marketing "Aturan Cashback").
- Logic bersama: `src/lib/cashbackRules.ts` (`fetchCashbackRules` cache 60s, `evaluateCashbackUsage`).
- Checkout: `CashbackUsageInput` menerima prop `services` (id + category), menyembunyikan/menampilkan alasan, membatasi `maxUsable`, dan melepas saldo otomatis bila aturan berubah. Dipakai di `Booking.tsx` & `MobileBookingWizard.tsx`.
- Server: kolom `bookings.service_ids text[]` diisi saat insert booking; RPC `apply_cashback_to_booking` memvalidasi ulang aturan (error: `cashback_disabled`, `service_not_eligible`, `below_min_transaction`, `exceeds_max`).

**Penegakan aturan (fix 2026-09-07):** policy `app_settings` "Public can view cashback usage rules" agar pelanggan bisa membaca key `cashback.usage_rules`; `fetchCashbackRules` gagal-baca → `DENIED_CASHBACK_RULES` (enabled=false, fail-safe), TTL cache 15s. Evaluasi UI & server memakai semantik "semua item harus memenuhi" (bukan salah satu), `exclude_products` dicek lebih dulu di semua mode. Checkout menyimpan `service_price` penuh; RPC `apply_cashback_to_booking` sendiri yang memotong `service_price` setelah validasi (sumber kebenaran tunggal). Pesan error ramah via `cashbackErrorMessage()`.
