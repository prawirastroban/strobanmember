## Goal

Tampilkan **detail potongan harga / diskon / promo** yang dipakai customer pada:
1. **Invoice** (`/invoice/:bookingId`) — baris Subtotal, Diskon (kode + nama), Total.
2. **Confirmation card** di halaman booking (`/my-booking/:bookingId`) — di blok "Total Tagihan", tambahkan baris subtotal dan diskon di atas Total.

Saat ini diskon dihitung di FE pakai `appliedRedemption`, tapi **tidak disimpan** ke booking → invoice & summary cuma menampilkan harga final tanpa konteks diskon.

---

## Change Summary

### 1. Migrasi — tambah kolom diskon di `public.bookings` (nullable, aman)

```sql
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS original_service_price numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_label text,
  ADD COLUMN IF NOT EXISTS discount_source text;  -- 'reward' | 'promo' | 'referral'
```

Booking lama: kolom NULL / 0 → tidak menampilkan baris diskon (backward-compatible).

### 2. Migrasi — update `generate_invoice_on_booking()` trigger

Sertakan diskon ke `items` jsonb agar invoice menampilkan kontekstual (subtotal + diskon + total). `amount` tetap = `NEW.service_price` (sudah final, jangan diubah agar tidak merusak alur pembayaran).

```sql
-- items = [
--   { name, type, price: original_or_service_price, quantity: 1 },
--   (opsional jika discount_amount > 0)
--   { name: discount_label || 'Diskon', type: 'discount',
--     code: discount_code, source: discount_source,
--     price: -discount_amount, quantity: 1 }
-- ]
```

Hanya `CREATE OR REPLACE FUNCTION`. Tidak menyentuh tabel/RLS.

### 3. `src/pages/Booking.tsx` & `src/components/booking/MobileBookingWizard.tsx`

Saat `.insert("bookings")`, tambahkan:
```ts
original_service_price: priceInfo.original + pickupTotalFee,
discount_amount: priceInfo.discount,
discount_code: appliedRedemption?.redemption_code ?? null,
discount_label: appliedRedemption?.reward_name ?? null,
discount_source: appliedRedemption?.source ?? null,
```
Tidak mengubah `service_price` (tetap final).

### 4. `src/pages/InvoiceView.tsx`

- Ambil juga 5 kolom diskon dari `bookings`.
- Render di blok Total: baris **Subtotal**, **Diskon (CODE — label)** dengan nilai negatif, lalu **Total** (sudah ada).

### 5. `src/pages/MyBooking.tsx`

Di section "Total Tagihan" (sekitar line 396), tambahkan (kondisional, hanya jika `discount_amount > 0`):
```
Subtotal     Rp X
Diskon       − Rp Y   (CODE)
─────────────────────
Total Tagihan Rp Z
```
Select tambahan kolom diskon di query (`line 157`).

---

## Verification

1. Buat booking baru tanpa voucher → invoice & MyBooking tampil seperti sekarang (tidak ada baris diskon).
2. Buat booking baru dengan voucher reward → MyBooking & Invoice tampil baris Subtotal, Diskon (kode + nama), Total.
3. Buka booking lama (sebelum migrasi) → tidak ada baris diskon (kolom NULL/0) → tidak rusak.
4. Print invoice → tampilan diskon ikut tercetak.

---

## Risk & Rollback

- **Data risk: NONE.** Hanya `ADD COLUMN` nullable + default 0; tidak ada rename/drop. Data lama tetap valid.
- **Trigger risk: LOW.** `CREATE OR REPLACE` pada `generate_invoice_on_booking`; amount invoice tidak berubah (hanya items diperkaya).
- **Payment risk: NONE.** Tidak mengubah `service_price`, `payment_status`, atau alur Midtrans.
- **Rollback:** revert commit FE + jalankan ulang versi lama `generate_invoice_on_booking`. Kolom baru boleh ditinggal (NULL aman).

---

**Menunggu persetujuan sebelum implementasi.**
