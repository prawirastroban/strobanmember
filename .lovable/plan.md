## Tujuan
1. Hilangkan tombol **"Bayar Sekarang"** dari admin (`/dashboard/bookings`) — desktop & mobile.
2. Sinkronisasi metode pembayaran customer ↔ admin (dropdown **Metode**).
3. Customer ubah metode → `cash`/`transfer`/`qris` ikut update, status booking tetap `confirmed`, `payment_status` jadi `pending` saat pilih `transfer`/`qris`.

---

## Perubahan

### 1. `src/components/admin/BookingsManager.tsx`
- **Hapus** blok `Bayar Sekarang` di `renderPrimaryCTA` (lines 711–724) beserta state `payDialog` jika tidak terpakai lagi. (Cek dulu—jika masih dipakai di edit dialog, sisakan; hanya hilangkan tombol).
- **Sumber `payMethodMap`**: ganti dari `payments.payment_method` → `bookings.payment_method` (sudah ada di SELECT line 331 `select("*")`). Inisialisasi map dari bookings saat fetch.
- **Realtime**: di channel bookings yang sudah ada, ikut update `payMethodMap` saat `payment_method` row berubah (mengganti channel `payments` yang sekarang).
- **`setPaymentMethod`**: tulis ke `bookings.payment_method` (UPDATE) **dan** mirror ke `payments` (upsert) supaya laporan keuangan tetap konsisten.

### 2. `src/components/admin/MobileBookingRow.tsx`
- Hapus blok tombol **Bayar Sekarang** (lines 293–298). `onPayNow` prop jadi opsional / dihapus dari pemanggil.

### 3. `src/pages/MyBooking.tsx` — `PaymentMethodPicker`
- Tambah opsi ketiga **QRIS** (icon `QrCode`). Tipe union: `"cash" | "transfer" | "qris"`.
- Ganti key `onsite` → `cash` agar 1:1 dengan vocab admin (`cash`/`transfer`/`qris`).
- Saat `choose(method)`:
  - `UPDATE bookings SET payment_method = <method>, payment_status = (method === 'cash' ? 'pay_later' : 'pending') WHERE id = ?`
  - Jika user ubah metode setelah sudah memilih, status booking tidak diubah (tetap `confirmed`); hanya `payment_status` yang ikut berubah sesuai aturan di atas.
- Tampilkan tombol **"Ubah Metode"** kecil ketika `payment_method` sudah terisi & `payment_status !== 'paid'` (re-render picker).
- Update label map: `cash` → "Bayar di Tempat", `transfer` → "Transfer Bank", `qris` → "QRIS".
- Section bukti pembayaran (line ~480) → muncul jika `payment_method IN ('transfer','qris')` & status `confirmed` & belum `paid`.

### 4. Migrasi DB
- Ubah CHECK constraint `bookings.payment_method` dari `('onsite','transfer','online')` → `('cash','transfer','qris')`.
- Backfill data: `UPDATE bookings SET payment_method = 'cash' WHERE payment_method = 'onsite'; UPDATE bookings SET payment_method = NULL WHERE payment_method = 'online';`

### 5. File pemanggil lain
- `Booking.tsx` & `MobileBookingWizard.tsx`: kalau ada referensi `payment_method: null` saat create—biarkan (customer pilih nanti). Jika hardcode `"onsite"` di mana pun, ganti `"cash"`.

---

## Hasil yang Diharapkan
- Admin tidak lagi melihat tombol oranye "Bayar Sekarang" — hanya alur konfirmasi → check-in → in_progress → completed.
- Saat customer pilih metode di MyBooking, dropdown **Metode** di `/dashboard/bookings` langsung terupdate (realtime).
- Customer ubah ke Transfer/QRIS → `payment_status` jadi `pending` (admin lihat "Menunggu"), booking status tidak berubah.
- Pilih "Bayar di Tempat" → `payment_status` jadi `pay_later`.