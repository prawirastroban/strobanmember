## Tujuan
Menambah tipe promo baru: alih-alih memberi diskon langsung, promo bisa memberikan **cashback** yang otomatis masuk ke **Saldo Cashback (Rp)** milik user setelah servis selesai. Saldo ini dapat dipakai user sebagai potongan (input manual) di transaksi berikutnya.

## Keputusan Desain (sudah dikonfirmasi)
- Saldo terpisah dari poin loyalty, dalam satuan **Rupiah**.
- Cashback dikreditkan saat booking berstatus **completed**.
- Pemakaian saldo: **input manual di checkout** (slider/jumlah Rp), tidak otomatis.
- Setiap promo punya **toggle reward_mode**: `discount` (default, langsung potong) atau `cashback` (masuk saldo).

## Skema Database (migration baru)

1. Kolom baru di `public.promos`:
   - `reward_mode text not null default 'discount'` (`'discount' | 'cashback'`)
   - `cashback_validity_days int not null default 90` (umur saldo cashback sejak dikreditkan)
   - `cashback_max_amount numeric` (cap opsional cashback per booking)

2. Kolom baru di `public.bookings`:
   - `promo_claim_id uuid` (claim yang dipakai, untuk hitung cashback saat completed)
   - `cashback_used numeric not null default 0` (saldo yang dipakai sebagai potongan)
   - `cashback_credit_amount numeric` (jumlah yang akan/sudah dikreditkan)
   - `cashback_credited boolean default false`

3. Tabel ledger baru `public.cashback_ledger`:
   - `user_id`, `type ('credit'|'debit'|'expire'|'refund')`, `amount`, `booking_id?`, `promo_id?`, `expires_at?`, `description`, `created_at`. Saldo = SUM(credit) - SUM(debit/expire) dengan FIFO untuk kadaluarsa.

4. View `public.cashback_balances` (`user_id`, `balance`, `expiring_soon`).

5. RPC functions (SECURITY DEFINER):
   - `apply_cashback_to_booking(_booking_id uuid, _amount numeric)` — validasi saldo & sisa harga, sisipkan debit, update booking.
   - `refund_cashback_for_booking(_booking_id uuid)` — refund debit jika booking dibatalkan.
   - Trigger `bookings_after_completed_credit_cashback`: ketika `status` berubah ke `completed`, untuk booking dengan `promo_claim_id` ber-`reward_mode='cashback'`, hitung cashback (`discount_value`% × subtotal, dibatasi `cashback_max_amount`), insert credit ke ledger, set `cashback_credited=true`, dan kirim notifikasi via tabel `notifications`.

6. RLS: user hanya lihat ledger miliknya; staff lihat semua; insert/debit hanya via RPC.

## Frontend

### Admin (PromosManager)
- Toggle baru "Mode Promo": `Diskon Langsung` / `Cashback ke Saldo`.
- Saat mode = cashback: tampilkan field `Persentase / Nominal Cashback`, `Maks. Cashback per booking (Rp, opsional)`, `Masa berlaku saldo (hari, default 90)`.
- Badge tabel: tag "Cashback" untuk promo dengan reward_mode=cashback.

### Halaman `/promo`
- Label diskon diganti "Cashback X%" untuk promo cashback, dengan note: "Masuk ke Saldo Cashback setelah servis selesai".

### Checkout (Booking.tsx & MobileBookingWizard.tsx)
- Saat voucher yang diapply ber-`reward_mode='cashback'`: harga **tidak dipotong** saat ini; tampilkan ringkasan "Anda akan dapat cashback Rp X" (estimasi) di summary.
- Booking insert menyimpan `promo_claim_id` (id claim) agar trigger DB bisa menghitung saat completed.
- Section baru **"Pakai Saldo Cashback"** di atas summary (muncul jika `balance > 0`): input nominal (max = min(balance, subtotal - other_discount)), tombol "Pakai", tombol "Hapus". Saat submit, panggil RPC `apply_cashback_to_booking` setelah booking tercipta.

### Komponen baru
- `src/components/CashbackBalanceCard.tsx`: kartu di Dashboard user (Loyalty page tab baru "Saldo Cashback") menampilkan balance, expiring soon, dan riwayat ledger.
- `src/hooks/useCashbackBalance.ts`: query view + realtime subscribe ke ledger.

### Loyalty page
- Tambah tab ke-4 "Saldo" di `src/pages/Loyalty.tsx` yang merender `CashbackBalanceCard`.

### Cancellation handling
- Pada `BookingsManager` ketika booking di-cancel setelah `cashback_used > 0`, panggil `refund_cashback_for_booking` untuk kembalikan saldo.

## Aspek Teknis Singkat
- Trigger dibuat AFTER UPDATE ON bookings, gate by `OLD.status IS DISTINCT FROM NEW.status AND NEW.status='completed' AND NEW.cashback_credited=false`.
- Kadaluarsa: cron job tidak dibuat di langkah ini; field `expires_at` disimpan, balance view memfilter `expires_at IS NULL OR expires_at > now()`. Bisa ditambah edge function scheduled di langkah berikutnya.
- Notifikasi: trigger insert ke tabel `notifications` ("Cashback Rp X telah masuk ke saldo Anda").
- i18n: tambahkan key baru di `src/i18n/id.ts` dan `en.ts` untuk label cashback.

## File yang Dibuat/Diubah
- Baru: `supabase/migrations/<ts>_cashback_wallet.sql`, `src/components/CashbackBalanceCard.tsx`, `src/hooks/useCashbackBalance.ts`.
- Diubah: `src/components/admin/PromosManager.tsx`, `src/components/booking/RedemptionCodeInput.tsx`, `src/pages/Booking.tsx`, `src/components/booking/MobileBookingWizard.tsx`, `src/pages/Promo.tsx`, `src/pages/Loyalty.tsx`, `src/components/admin/BookingsManager.tsx` (cancel refund), `src/i18n/id.ts`, `src/i18n/en.ts`.

## Tahapan Implementasi
1. Jalankan migration (skema + trigger + RPC + RLS).
2. Update PromosManager UI dengan toggle reward_mode.
3. Bangun hook + komponen Saldo Cashback + tab di Loyalty.
4. Integrasi checkout: simpan `promo_claim_id`, tampilkan estimasi cashback, section Pakai Saldo + panggil RPC.
5. Update halaman /promo dengan label cashback.
6. Tambah refund saat cancel.
