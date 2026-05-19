## Tujuan

Saat user memilih metode pembayaran **Transfer Bank** atau **QRIS** di halaman `/my-booking/:id`, langsung tampilkan rekening / QRIS yang sesuai dengan **cabang booking** (yang sudah di-setup admin di Dashboard → Keuangan → Manual Payments), bukan hanya pesan teks generik. Tetap arahkan ke `/payment/manual/:id` untuk upload bukti.

## Akar Masalah

- `manual_payment_qris` sudah punya kolom `branch` (slug), tapi `manual_payment_accounts` hanya punya `branch_label` (teks bebas) → tidak bisa difilter per cabang.
- Di `MyBooking.tsx` (baris ~484-502), section setelah pilih transfer/qris hanya menampilkan kalimat "Transfer ke rekening bengkel lalu upload bukti di bawah" tanpa data rekening / gambar QRIS.

## Rencana

### 1. Migrasi DB

- Tambah kolom `branch text` (nullable) pada `public.manual_payment_accounts`.
- Tidak menghapus `branch_label` (tetap dipakai sebagai label tambahan / catatan cabang manual).

### 2. Admin — `ManualPaymentManager.tsx` (BankAccountsTab)

- Tambah field **Cabang** berupa `<Select>` (mengisi `branch` dengan slug cabang, opsi `Semua cabang` = `null`). Persis pola yang sudah dipakai di `QrisTab`.
- Tarik daftar cabang dari `branches` table (sudah di-load di QrisTab — pindahkan ke parent atau ulangi load).
- `branch_label` tetap ada (opsional, free-text untuk catatan tambahan).

### 3. Customer — `MyBooking.tsx`

Ganti panel kecil di baris 485-502 dengan komponen baru `BranchPaymentInfo` (file baru `src/components/payment/BranchPaymentInfo.tsx`) yang:

- Menerima props `bookingId`, `branch`, `method` (`"transfer" | "qris"`), `amount`, dan callback reset metode.
- Fetch sekali:
  - `manual_payment_accounts` aktif → filter `branch === booking.branch` dengan fallback ke baris dengan `branch IS NULL`.
  - `manual_payment_qris` aktif → filter `branch === booking.branch` dengan fallback ke `branch IS NULL`.
- Tampilan transfer: kartu rekening (logo bank, nama, no rek, atas nama, badge "Salin"), nominal yang harus ditransfer (`amount`), tombol "Upload Bukti Transfer" → link `/payment/manual/:id`.
- Tampilan QRIS: gambar QRIS, merchant name, nominal, tombol "Upload Bukti QRIS".
- Selalu tampilkan tombol "Ubah Metode Pembayaran" (existing `ChangeMethodButton`).
- Jika tidak ada rekening/qris match → tampilkan pesan ramah + tombol ke `/payment/manual/:id`.

Tombol upload bukti existing (section "Lampiran Bukti Pembayaran" di bawah, baris 506+) tetap apa adanya.

### 4. (Opsional/konsisten) — `ManualPayment.tsx`

Update filter bank account agar ikut `bookingBranch`: prefer `acc.branch === bookingBranch`, fallback ke `acc.branch IS NULL`. Hari ini ManualPayment.tsx hanya mem-filter QRIS per cabang dan menampilkan semua rekening — biar konsisten dengan info di MyBooking.

## Teknis Singkat

- Kolom baru: `manual_payment_accounts.branch text NULL`.
- Tidak ada perubahan RLS (sudah `is_active = true` publik untuk SELECT).
- Komponen baru kecil (~120 baris) untuk tampilan rekening/QRIS yang reusable juga dari ManualPayment.tsx jika dibutuhkan ke depan.
- Tidak ada perubahan pada fungsi pembayaran, edge function, atau Midtrans.
