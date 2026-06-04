## Tujuan
Admin cabang, Staff, dan CS Pusat dapat memilih & menerapkan **promo yang sedang berjalan** saat membuatkan booking konsumen via Quick Booking. Diskon promo akan langsung mengurangi total harga booking.

## Perubahan

### 1. `StaffQuickBookingDialog.tsx` (dialog utama: Pesan Servis di sidebar staff/admin)
- Tambah **step baru "Promo"** di antara *Service & Schedule* dan *Confirm*. Urutan jadi 5 langkah:
  ```
  1 Customer  →  2 Vehicle  →  3 Service & Schedule  →  4 Promo  →  5 Confirm
  ```
- Step Promo:
  - Query `promos` aktif: `is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now())`, urut `sort_order`.
  - Filter sisi klien berdasarkan layanan terpilih: promo dipakai bila
    - `applicable_service_ids` kosong **atau** memuat `service.id`, **dan**
    - `applicable_categories` kosong **atau** memuat `service.category`, **dan**
    - `service.price >= min_purchase`.
  - List sebagai kartu (radio): judul, badge, diskon (`30%` atau `Rp 50.000`), syarat singkat, dan harga setelah diskon.
  - Opsi **"Tanpa Promo"** selalu tersedia (default).
  - Jika tidak ada promo eligible: tampilkan empty-state "Tidak ada promo berjalan untuk layanan ini" + tombol skip ke Confirm.
- Step Confirm:
  - Tampilkan ringkasan harga: `Subtotal`, `Promo: TITLE (-Rp X)` bila ada, dan `Total` (final).
  - Saat submit, kirim `service_price = finalPrice` dan append catatan `customer_notes`:
    `[Promo: <title> (-Rp <discount>)]` (digabung dengan catatan lain bila sudah ada).

### 2. `QuickBookingDialog.tsx` (dialog lama di Customer Detail CRM)
- Tambah step Promo dengan pola yang sama (urutan: Vehicle → Service & Schedule → **Promo** → Confirm; total 4 → 5 step).
- Catatan: dialog ini pakai daftar service hard-coded, jadi filter `applicable_service_ids` tidak cocok. Pakai aturan ringan: tampilkan semua promo aktif dengan `applicable_service_ids` & `applicable_categories` keduanya kosong (promo "all services"), atau yang `min_purchase <= price`. Promo dengan target service tertentu disembunyikan di dialog ini agar tidak salah apply.

### 3. Hook helper baru `src/hooks/useActivePromos.ts`
- Reusable: `useActivePromos({ serviceId?, category?, price? })` → kembalikan `{ promos, loading }` sudah ter-filter di klien.
- Mempermudah pemakaian kembali bila nanti ada dialog booking lain (mis. QuickBookingDialog) atau mobile wizard.

### 4. Util kecil `src/lib/promoDiscount.ts`
- `computeDiscount(promo, basePrice) → { discount, finalPrice, label }` (handle `percentage` & `fixed`, floor ke integer, tidak lebih besar dari basePrice).

## Catatan teknis
- **Tidak ada perubahan skema DB.** Kolom `service_price` di `bookings` sudah menampung harga final (pola yang sama dengan flow konsumen di `Booking.tsx`).
- Tidak membuat `promo_claims` record (promo di-apply oleh staff, bukan voucher yang di-klaim user). Tracking promo cukup via `customer_notes`. Bisa dikembangkan nanti bila perlu laporan promo-per-booking.
- RLS `promos` sudah mengizinkan admin & staff melihat semua promo (kebijakan "Staff can view all promos") → tidak perlu policy baru.
- Pickup fee tidak terkena diskon (konsisten dengan flow konsumen).

## File yang diubah/dibuat
- **Baru**: `src/hooks/useActivePromos.ts`, `src/lib/promoDiscount.ts`
- **Edit**: `src/components/admin/StaffQuickBookingDialog.tsx`, `src/components/admin/QuickBookingDialog.tsx`
