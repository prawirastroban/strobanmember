## Fitur Scan QR Booking — Konfirmasi Pembayaran di Cabang

Tujuan: customer datang ke bengkel sambil menunjukkan QR di HP-nya. Admin cabang scan QR tersebut dari dashboard, langsung melihat detail booking + tombol konfirmasi pembayaran sesuai metode yang sudah dipilih customer.

### Alur singkat

```text
Customer (HP)                          Admin Cabang (tablet/HP kantor)
─────────────                          ──────────────────────────────
Pilih metode bayar (cash/transfer/     Buka Dashboard → "Scan QR Booking"
qris) di Checkout / PaymentDialog →    [ Kamera live ]
muncul layar "Tunjukkan ke Kasir"               ↓
[ QR besar + Kode 8-char + total ]     Scan QR (atau ketik kode manual)
                                                ↓
                                       Detail booking + ringkasan tagihan
                                                ↓
                                       [Konfirmasi Pembayaran] → RPC
                                       confirm_manual_payment
                                                ↓
                                       Booking ter-confirmed otomatis
```

### 1. Sisi Customer — layar "Tunjukkan ke Kasir"

Hanya muncul **setelah customer memilih metode pembayaran manual** (cash / transfer / QRIS), bukan di semua halaman booking.

- Di `src/components/PaymentDialog.tsx` step `result === "awaiting" || "pay_later"`: tambah blok QR di atas pesan "Menunggu Verifikasi Staff", isinya:
  - QR code (payload = `booking.id`)
  - Kode booking pendek (8 char pertama dari id, uppercase, contoh `7FE08A42`)
  - Total tagihan + metode terpilih
  - Teks: "Tunjukkan layar ini ke kasir bengkel"
- Di `src/pages/MyBooking.tsx`: jika booking `payment_status` ∈ `awaiting_confirmation | pay_later` dan `status` belum `confirmed/cancelled/completed`, tampilkan kartu **"Tunjukkan QR ke Kasir"** di paling atas (sticky di mobile) sehingga customer bisa buka lagi nanti.
- Untuk metode `midtrans` QR tidak ditampilkan (otomatis via webhook).

Komponen baru: `src/components/booking/BookingQRCard.tsx` (reusable di PaymentDialog & MyBooking).

### 2. Sisi Admin — halaman Scanner

- Route baru: `/dashboard/scanner` (akses `staff`, `admin`, `admin_cabang`).
- Item sidebar baru "Scan QR Booking" (icon `ScanLine`) di kelompok Booking.
- Komponen `src/components/admin/BookingScanner.tsx`:
  - Kamera web via library `@yudiel/react-qr-scanner` (cukup untuk PWA & laptop; native MLKit bisa ditambah belakangan).
  - Auto-pilih kamera belakang di mobile (`facingMode: environment`).
  - Input manual sebagai fallback (paste UUID atau ketik 8 char).
- Setelah scan/submit:
  1. Resolve booking: `select * from bookings ... .eq("id", uuid)` atau (untuk short code) `.ilike("id", code+'%').limit(2)` → tolak jika hasil > 1 (ambiguous).
  2. **Branch guard**: untuk `admin_cabang`, jika `booking.branch !== userBranch` tampilkan error "Booking ini bukan untuk cabang Anda" dan jangan munculkan tombol aksi.
  3. Tampilkan kartu detail: customer, kendaraan, layanan, jadwal, status, metode pembayaran terpilih, total tagihan, status payment terakhir.
  4. Tombol utama **"Konfirmasi Pembayaran"**:
     - Cek apakah ada row di `payments` untuk booking ini. Jika belum ada (mis. customer belum lewat PaymentDialog), insert payment baru dengan metode yang dipilih admin (cash default) lalu panggil RPC `confirm_manual_payment`.
     - Jika sudah ada dan masih `pending`, langsung panggil `confirm_manual_payment(payment_id)`.
     - Toast sukses + auto-refresh detail.
  5. Tombol "Scan booking lain" untuk reset ke kamera.

### 3. Akses & guardrails

- Sidebar item visible untuk semua admin role; halaman wrap di `<AdminRoute>`.
- Tidak ada perubahan DB / RPC — `confirm_manual_payment` sudah memvalidasi `is_admin_cabang_for(branch)`.
- Tidak menambah kolom baru di `bookings` (tetap pakai `id` UUID; kode 8-char hanya tampilan).

### 4. Detail teknis (untuk dev)

- Dependencies baru: `qrcode.react`, `@yudiel/react-qr-scanner`.
- File baru:
  - `src/components/booking/BookingQRCard.tsx`
  - `src/components/admin/BookingScanner.tsx`
- File diubah:
  - `src/components/PaymentDialog.tsx` (tambah QR di step result manual)
  - `src/pages/MyBooking.tsx` (kartu QR sticky kalau payment menunggu)
  - `src/pages/Admin.tsx` (route `scanner`)
  - `src/components/admin/AdminSidebar.tsx` (menu "Scan QR Booking")

### 5. Yang sengaja tidak dimasukkan

- Tidak ada kamera/scanner di sisi customer (rekomendasi: customer cukup menampilkan QR).
- Tidak ada plugin native MLKit (bisa ditambah nanti kalau perlu performa kamera ekstra).
- Tidak generate PDF e-ticket / print QR.
