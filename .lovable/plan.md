## Tujuan

Buat akses "Lihat Bukti Transfer" lebih mudah dan konsisten di dua halaman:

1. **`/dashboard/keuangan/payment`** (PaymentsManager) — tambah tombol bukti **langsung di baris tabel & mobile card** (sebelumnya hanya di dialog Detail).
2. **`/dashboard/history`** (TransactionHistory) — tambah tombol bukti di kolom action setiap baris untuk transaksi yang metode pembayarannya `transfer` atau `qris`.

## Perubahan

### 1. Buat komponen reusable `src/components/admin/keuangan/TransferProofButton.tsx`
- Props: `bookingId: string`, `paymentMethod?: string | null`, `size?: "sm" | "icon"`, `variant?: ...`.
- Behavior:
  - Tampil hanya jika `paymentMethod` ∈ {`transfer`, `qris`} (atau jika prop tidak diberikan, tetap tampil — page caller boleh memutuskan).
  - Saat diklik, fetch latest `manual_payment_proofs` untuk `booking_id` (limit 1 order by created_at desc).
  - Buka `Dialog` viewer (mirip yang sudah ada di PaymentsManager) menampilkan:
    - Thumbnail/iframe (PDF) atau image.
    - Info pengirim, nominal, tanggal transfer, status, catatan.
    - Tombol Salin URL, Download, Buka tab baru.
  - Jika tidak ada proof: toast info "Belum ada bukti transfer untuk booking ini".

### 2. `src/components/admin/PaymentsManager.tsx`
- Import & gunakan `TransferProofButton` di:
  - Baris tabel desktop (kolom Aksi) — hanya untuk `transfer`/`qris`.
  - Mobile card action row.
- Card "Bukti Pembayaran" + viewer di dalam dialog Detail tetap dipertahankan (sudah berjalan baik dan menampilkan summary lengkap).

### 3. `src/components/admin/TransactionHistory.tsx`
- Pastikan query payments sudah mengambil `payment_method` (sudah). Pastikan field `payment_method` tersedia per row (sudah, lihat line 128).
- Sisipkan `TransferProofButton` di kolom **Invoice** (atau kolom action baru "Bukti") pada tabel desktop, dan di action row mobile card — render hanya jika `r.payment_method` ∈ {`transfer`, `qris`}.

## Catatan

- Tidak menyentuh schema, RLS, atau edge functions — semua query menggunakan SELECT pada `manual_payment_proofs` yang sudah ter-RLS untuk admin.
- Tombol pakai icon `Receipt` + label "Bukti" agar ringkas dan konsisten antar halaman.
- Tidak mengubah dialog viewer yang sudah ada di PaymentsManager Detail; cukup share viewer baru via komponen reusable.