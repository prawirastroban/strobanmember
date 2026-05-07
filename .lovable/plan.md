## Tujuan

Saat admin di **Dashboard → Marketing → Service Manager** menyetel harga sebuah layanan menjadi `0`, semua tampilan harga di sisi customer dan booking otomatis menjadi label **"FREE"** (bukan "Rp 0").

## Pendekatan

Buat satu helper terpusat agar perilakunya konsisten di seluruh app, lalu gantikan pemanggilan format harga layanan yang ada.

### 1. Helper baru
File baru: `src/lib/priceFormat.ts`

```ts
import { formatRupiah } from "./reportFormat";

export const formatServicePrice = (value: number | null | undefined) => {
  const n = Number(value) || 0;
  if (n <= 0) return "FREE";
  return formatRupiah(n);
};
```

### 2. Titik tampilan yang diganti

Layar yang menampilkan harga **layanan / service** dari katalog atau dari booking — diganti memakai `formatServicePrice`:

- `src/components/ServiceCatalog.tsx`
- `src/components/mobile/MobileServiceList.tsx`
- `src/components/mobile/home/ServiceCategoryGrid.tsx`
- `src/components/mobile/home/HeroBookingForm.tsx`
- `src/pages/Booking.tsx` (langkah pilih layanan + ringkasan)
- `src/components/booking/MobileBookingWizard.tsx`
- `src/components/admin/QuickBookingDialog.tsx`
- `src/components/admin/StaffQuickBookingDialog.tsx`
- `src/components/UpcomingBookings.tsx`, `src/components/reminder/MobileBookingCard.tsx`
- `src/pages/MyBooking.tsx`, `src/pages/ServiceHistory.tsx`, `src/pages/HistoryPerawatan.tsx`, `src/pages/ServiceCompleted.tsx`, `src/pages/ReminderService.tsx`, `src/pages/Katalog.tsx`
- `src/pages/InvoiceView.tsx` (line item layanan; total tetap `formatRupiah`)

### 3. Yang tidak diubah

- Total tagihan, subtotal, pembayaran, laporan keuangan, transaksi — tetap `formatRupiah`. "FREE" hanya menggantikan harga per-item layanan.
- Harga ban (tires) tidak terpengaruh.
- Data DB tidak diubah; checkout tetap mengirim `0`.
- Service Manager (admin) tetap pakai input numeric agar admin bisa lihat/edit `0`; kolom harga di list akan menampilkan badge "FREE".

### 4. Styling

Saat menampilkan "FREE", pakai warna aksen hijau (`text-emerald-500`) untuk kontras dengan harga reguler.

## Out of scope

- Promo/diskon dinamis menjadi 0 (sudah dihandle di logic checkout).
- i18n: label tetap "FREE" di semua bahasa.
