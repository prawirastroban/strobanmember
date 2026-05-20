# Perbaikan Visibilitas Bukti Transfer di Dashboard Admin

## Masalah
- Pelanggan upload bukti (Transfer/QRIS) tapi admin tidak tahu — tombol "Bukti" hanya muncul jika admin sudah memilih metode pembayaran di dropdown, padahal pelanggan sendiri sudah memilih saat checkout.
- Status `awaiting_confirmation` (menunggu verifikasi) tidak ada di `PAY_STATUS_OPTIONS`, sehingga dropdown otomatis fallback ke "Belum Lunas" → admin tidak melihat sinyal bahwa ada bukti menunggu.
- Di versi mobile (BookingsManager, MobileBookingRow, PaymentsManager, TransactionHistory) tombol bukti juga tergantung pada metode yang dipilih admin dan tersembunyi di accordion.
- Tidak ada notifikasi/badge global ketika bukti baru di-upload.

## Tujuan
Setiap booking yang punya bukti pembayaran (di tabel `manual_payment_proofs`) menampilkan tombol "Lihat Bukti" — selalu — di Bookings, Transaction History, dan Payments, baik desktop maupun mobile, dengan badge warna ketika status proof masih `pending`.

## Perubahan

### 1. `src/components/admin/keuangan/TransferProofButton.tsx`
- Hapus syarat awal `if (!methodAllowed && !allowUpload) return null;`. Sebagai gantinya, tombol selalu di-render bila `hasProof === true`, tanpa peduli `paymentMethod`.
- Tambahkan prop opsional `showWhenEmpty` (default `false`) supaya panel yang ingin tetap menampilkan placeholder bisa, tetapi default-nya tombol disembunyikan ketika tidak ada bukti & tidak `allowUpload`.
- Tambah varian visual `pending` (badge kuning + pulse) ketika proof.status === 'pending' (perlu fetch awal lewat query existing yang sudah mengambil count → ubah jadi ambil juga `status` agar bisa highlight).
- Label otomatis: "Bukti (Menunggu)" saat pending, "Bukti (Disetujui)" / "Bukti (Ditolak)" sesuai status.

### 2. `src/components/admin/BookingsManager.tsx`
- Tambahkan `PAY_STATUS_OPTIONS`:
  - `{ value: "awaiting_confirmation", label: "Menunggu Verifikasi" }`
  - `{ value: "pending", label: "Pending" }`
  Agar status pelanggan yang sudah upload bukti tampil sesuai.
- Render `TransferProofButton` tanpa kondisi `payMethodMap[...] === transfer/qris`. Cukup render selalu (komponen akan auto-hide jika tidak ada bukti dan bukan upload-flow). Tambahkan tetap `allowUpload` saat metode bank transfer/qris.
- Pada baris booking, tampilkan badge merah kecil "Bukti Baru" pada area status pembayaran ketika `payment_status === 'awaiting_confirmation'`.

### 3. `src/components/admin/MobileBookingRow.tsx`
- Tampilkan tombol `TransferProofButton` di header card (bukan hanya di dalam accordion) ketika booking punya bukti — minimal dalam bentuk badge kecil "Bukti TF" yang membuka dialog.
- Hapus kondisi metode pembayaran agar bukti tetap terlihat meski admin belum set metode.

### 4. `src/components/admin/TransactionHistory.tsx` & `src/components/admin/PaymentsManager.tsx`
- Hapus dependensi `paymentMethod` di kondisi tampilkan tombol. Selalu render `TransferProofButton` (komponen auto-hide jika tidak ada bukti).
- Tambah kolom/badge "Bukti" di tampilan mobile (sekarang kolom hanya muncul di tabel desktop). Render compact card row di breakpoint `sm:hidden`.

### 5. (Opsional, tetap dalam scope sinyal admin)
Tambahkan dot indikator di sidebar/menu "Bookings" & "Transaksi" ketika ada `manual_payment_proofs` dengan `status='pending'` belum direview. Bila terlalu besar untuk satu iterasi, fitur ini akan di-skip dan dicatat sebagai follow-up.

## Verifikasi
1. Booking `84bb1b4f-…` (QRIS, pending proof) → buka BookingsManager: harus muncul badge "Menunggu Verifikasi" + tombol "Bukti (Menunggu)" tanpa harus pilih metode dulu.
2. Buka di viewport mobile (≤ 768px): tombol/lihat bukti terlihat tanpa expand accordion.
3. PaymentsManager dan TransactionHistory desktop+mobile: tombol bukti terlihat.
4. Cek dialog menampilkan gambar/PDF bukti dengan tombol Download.

## Catatan
Tidak ada perubahan skema DB / RLS. Hanya komponen UI admin.
