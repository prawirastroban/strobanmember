## Tujuan
Tampilkan baris **"Metode Pembayaran"** di card pembayaran `MyBooking` yang otomatis tersinkron dengan kolom **Metode** di `/dashboard/bookings` (sumber: `bookings.payment_method`).

## Perubahan

### `src/pages/MyBooking.tsx` — Card pembayaran (sekitar line 392–414)
Tambah satu baris baru di antara "Total Tagihan" dan "Status Pembayaran":

```
Metode Pembayaran    [Badge: Bayar di Tempat / Transfer Bank / QRIS / Belum Dipilih]
```

- Sumber: `booking.payment_method` (sudah ada di state, sudah realtime via subscription bookings yang ada).
- Mapping label (konsisten dengan `PAYMENT_METHOD_LABEL` yang sudah ada):
  - `cash` → "Bayar di Tempat" (icon `Banknote`)
  - `transfer` → "Transfer Bank" (icon `CreditCard`)
  - `qris` → "QRIS" (icon `QrCode`)
  - `null/empty` → "Belum Dipilih" (muted)
- Styling: Badge dengan border tipis, mengikuti gaya badge "Status Pembayaran" agar visually konsisten.

## Hasil
- Customer langsung lihat metode pembayaran yang dipilih (atau "Belum Dipilih") di halaman MyBooking.
- Saat admin mengubah dropdown **Metode** di `/dashboard/bookings`, baris ini ikut update via realtime (sudah ada channel bookings).
- Sebaliknya saat customer ubah metode lewat `PaymentMethodPicker`, admin dashboard juga sudah ikut update (implementasi sebelumnya).
