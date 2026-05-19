## Masalah yang Diperbaiki
1. **Customer tidak bisa upload bukti**: di `MyBooking.tsx` tombol upload baru aktif setelah booking `confirmed` (`payAllowed`). Customer ingin bisa kirim bukti segera setelah pilih metode (admin baru `confirmed` setelah verifikasi bukti).
2. **Tidak ada akses bukti di `/dashboard/bookings`**: `TransferProofButton` cuma dipakai di `PaymentsManager` & `TransactionHistory`. Di list bookings admin tidak bisa lihat/upload bukti.
3. **Admin tidak bisa upload bukti atas nama customer** (skenario customer datang ke cabang, bayar transfer/QRIS, admin foto bukti & lampirkan ke booking).

## Perubahan

### 1. `src/pages/MyBooking.tsx` — section "Lampiran Bukti Pembayaran"
- Hapus gating `payAllowed`. Section sekarang tampil untuk semua booking dengan `payment_method ∈ {transfer, qris}` dan `status !== cancelled`.
- Hapus blok "Upload bukti tersedia setelah booking dikonfirmasi admin" + tombol disabled. Cukup tampilkan tombol **"Upload Bukti Transfer / QRIS"** (link ke `/payment/manual/:id`).
- Tetap show banner kecil: jika `booking.status === 'waiting_confirmation'` → tampilkan info "Bukti yang dikirim akan diverifikasi admin saat konfirmasi booking." (informatif, tidak blocking).

### 2. Migration baru — RPC `staff_submit_manual_payment_proof`
RPC `SECURITY DEFINER` khusus staff/admin untuk upload bukti atas nama customer. Param:
`_booking_id, _method ('transfer'|'qris'), _sender_name, _sender_bank, _transfer_amount, _transfer_date, _proof_url, _notes, _mark_paid bool default true`.

Logika:
- Cek caller punya role `admin` atau `staff`, kalau tidak → error.
- Ambil booking → ambil `v_user_id := booking.user_id` (proof tetap milik customer).
- Upsert `payments` (booking_id, user_id, amount, payment_method, payment_status = `_mark_paid ? 'paid' : 'pending'`, `verified_by_webhook = false`).
- Insert `manual_payment_proofs` dengan `status = _mark_paid ? 'approved' : 'pending'`, `reviewed_by = caller`, `reviewed_at = now()` saat approved.
- Update `bookings.payment_method = _method`, `payment_status = _mark_paid ? 'paid' : 'awaiting_confirmation'`.

### 3. Komponen baru `src/components/admin/keuangan/UploadProofDialog.tsx`
Dialog upload untuk staff:
- Tab Transfer / QRIS (default sesuai `booking.payment_method`, kalau cash/null → default transfer dan otomatis update method).
- Field: nama pengirim (default customer_name), bank pengirim (opsional), nominal (default service_price), tanggal transfer (default today), catatan (opsional), checkbox **"Tandai langsung Lunas"** (default true), file picker (image/PDF, max 10MB — pakai validator yang sama dengan `ManualPayment.tsx`).
- Upload file ke bucket `payment-proofs` di path `{customer_user_id}/{bookingId}/admin-{ts}.{ext}` (staff sudah punya policy `Staff manage all proofs`).
- Panggil RPC `staff_submit_manual_payment_proof`.
- Setelah sukses → callback `onUploaded()` untuk refresh list & toast sukses.

### 4. `src/components/admin/keuangan/TransferProofButton.tsx`
Tambah prop opsional `allowUpload?: boolean` dan `customerName?: string`, `servicePrice?: number`, `customerUserId?: string`, `onChanged?: () => void`.

Jika `allowUpload && hasProof === false`:
- Ganti tombol "Belum Ada" jadi tombol **"Upload Bukti"** (variant outline, icon `Upload`) yang membuka `UploadProofDialog`.
- Jika `hasProof === true` → perilaku existing (lihat bukti).

Tambah juga di dialog viewer (saat sudah ada proof) tombol kecil **"Upload Ulang"** (hanya jika `allowUpload`) untuk replace bukti.

### 5. `src/components/admin/BookingsManager.tsx`
Di renderer row (sekitar line 950–975, baris controls metode/status), tambah `<TransferProofButton>` setelah Select payment status, dengan props:
```
bookingId={booking.id}
paymentMethod={payMethodMap[booking.id]}
allowUpload
customerName={booking.customer_name}
servicePrice={booking.service_price}
customerUserId={booking.user_id}
onChanged={fetchBookings}
```

Juga tambahkan di `MobileBookingRow.tsx` (atau dialog detail-nya) tombol yang sama agar konsisten mobile.

### 6. Realtime sync ke MyBooking
`MyBooking.tsx` sudah subscribe perubahan `bookings`. Untuk bukti baru (proof yang diunggah admin) juga di-refresh: tambah channel kedua subscribing `manual_payment_proofs` di booking_id ini → refetch `latestProof`. Hasil: customer otomatis lihat bukti & status "Lunas" tanpa reload.

## Hasil
- Customer bisa upload bukti kapan saja setelah pilih metode transfer/QRIS.
- Admin di `/dashboard/bookings` punya tombol **Bukti** per baris: lihat (jika ada) atau upload (jika belum), termasuk skenario admin memfoto bukti customer di cabang.
- Saat admin upload + tandai Lunas → `bookings.payment_status` jadi `paid`, sinkron realtime ke `MyBooking` customer dan ke dropdown status di dashboard.
