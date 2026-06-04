## Tampilkan Info Diskon/Promo di Rincian Booking (Admin)

Field `original_service_price`, `discount_amount`, `discount_code`, `discount_label`, `discount_source` sudah ada di tabel `bookings` dan sudah ikut ter-fetch via `select("*")`. Tinggal ditampilkan.

### Perubahan (`src/components/admin/BookingsManager.tsx`)

1. **Tambah field ke interface `Booking`**:
   ```ts
   original_service_price?: number | null;
   discount_amount?: number | null;
   discount_code?: string | null;
   discount_label?: string | null;
   discount_source?: string | null;
   ```

2. **Section "Layanan & Pembayaran" di dialog Rincian Booking** — tampilkan info diskon hanya jika `discount_amount > 0`:
   - Baris **Harga Normal** (coret) → `original_service_price` (fallback `service_price + discount_amount`).
   - Baris **Diskon** → `- Rp xxx` dengan warna `text-emerald-600`, suffix label promo (mis. `PROMO20 · Diskon Member`).
   - Baris **Sumber** kecil (opsional, hanya jika ada) → `discount_source` (promo / referral / loyalty), di-capitalize.
   - Baris **Harga** (yang sekarang) tetap, tapi rename label jadi **"Total Bayar"** ketika ada diskon.

3. **Helper kecil** `discountSourceLabel(s)` untuk map `promo` → "Promo", `referral` → "Referral Voucher", `loyalty` → "Reward Loyalty", lainnya capitalize.

### Tidak diubah
- Query, DB, RLS, edge function.
- Tampilan card list & MobileBookingRow.
