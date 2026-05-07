## Tujuan
Tambahkan aksi pembayaran langsung di Dashboard Bookings sehingga admin bisa:
1. Memilih metode pembayaran (Cash / Transfer / QRIS / Midtrans) langsung dari baris booking.
2. Menandai status **Lunas / Belum Lunas** tanpa harus ke menu Keuangan.
3. Untuk booking yang **belum check-in** dan masih `unpaid`/`pending`, tampilkan tombol **"Bayar Sekarang"** yang membuka PaymentDialog yang sudah ada (opsional dipakai admin untuk mewakili customer).

## Perubahan UI

### `src/components/admin/BookingsManager.tsx`
Pada kolom **Payment** dan **Action** untuk tab Pending dan Confirmed:

**Kolom Payment** — ganti dari badge statis menjadi grup kontrol kompak:
- `Select` metode pembayaran (Cash / Transfer Bank / QRIS / Midtrans / Lainnya) — disimpan ke `payments.payment_method` (atau `bookings` jika perlu kolom baru).
- `Select` atau `Switch` status: **Lunas** ↔ **Belum Lunas** — update `bookings.payment_status` ke `paid` / `unpaid` dan upsert row di `payments` dengan `verified_by_webhook=false`, `payment_status='paid'`.
- Badge status tetap muncul di atas kontrol untuk indikator cepat.

**Kolom Action** — tambahkan tombol baru bila kondisi:
- `booking.status ∈ {pending, waiting_confirmation, confirmed}` (belum check-in)  
  **DAN** `booking.payment_status ∈ {unpaid, pending, pending_payment, failed}`  
  → tampilkan tombol merah-kuning **"Bayar Sekarang"** yang membuka `PaymentDialog` existing dengan `bookingId`/`amount`/`bookingStatus` booking tersebut. Setelah sukses, list otomatis refresh via realtime (sudah ada).

### `src/components/admin/MobileBookingRow.tsx`
Mirror kontrol yang sama dalam bentuk stack vertikal:
- Dropdown metode pembayaran
- Toggle Lunas/Belum Lunas
- Tombol "Bayar Sekarang" (kondisional)

### Handler baru di `BookingsManager.tsx`
```text
async function setPayment(bookingId, { method?, status? })
  - update bookings.payment_status (jika status diubah)
  - upsert payments row (booking_id unique) dgn payment_method, amount=service_price,
    payment_status='paid'|'pending', verified_by_webhook=false, user_id=booking.user_id
  - toast sukses + log activity_logs (type='payment_manual_admin')
```

Re-use kebijakan RLS existing — `Staff can update all bookings` & `Staff can update all payments` sudah cover.

## Tidak diubah
- Menu Keuangan / ManualPaymentManager tetap ada untuk konfirmasi bukti dari customer.
- PaymentDialog existing (tidak perlu dimodifikasi struktur, hanya dipanggil dari admin row).
- Skema database — kolom `payment_method` & `payment_status` sudah ada di tabel `payments` dan `bookings`.

## Detail Teknis
- `PaymentDialog` saat ini menerima `bookingId`, `amount`, `bookingStatus`, `open`, `onOpenChange`. Akan dibungkus state `payDialogBookingId` di BookingsManager.
- Untuk `setPayment` ke 'paid' tanpa Midtrans, `payments` row di-upsert by `booking_id` (perlu unique constraint). Akan cek dulu via select; jika ada → update, jika tidak → insert. Tidak butuh migration.
- Activity log opsional via insert ke `activity_logs` (RLS sudah izinkan staff).

## Hasil Akhir
- Admin bisa 1-klik tandai booking Lunas + pilih metode dari tabel.
- Customer yang belum bayar bisa langsung dibantu admin via tombol "Bayar Sekarang".
- Tidak perlu pindah ke menu Keuangan untuk transaksi sederhana.