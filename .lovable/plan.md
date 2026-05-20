# Akses Bukti Transfer untuk Admin Cabang & CS Pusat

## Masalah
RLS pada `manual_payment_proofs` saat ini hanya memberi izin baca/update ke role `admin` dan `staff`. Akibatnya:
- **Admin Cabang** (`admin_cabang`) tidak bisa melihat bukti transfer pelanggan walaupun booking-nya berada di cabang mereka.
- Role `staff` (CS Pusat) sudah punya akses — tidak ada masalah teknis, hanya perlu dikonfirmasi.

File fisiknya sudah publik di bucket `payment-proofs`, jadi yang perlu diperbaiki hanya RLS tabel metadata-nya.

## Asumsi
- "CS Pusat" = role `staff` (sudah dapat akses penuh). Jika nanti ada role berbeda untuk CS, tinggal ditambahkan di policy yang sama.
- Admin Cabang hanya boleh melihat bukti untuk booking di cabang yang ditugaskan ke akunnya (memakai helper `is_admin_cabang_for(branch)` yang sudah dipakai untuk `bookings` & `payments`).

## Perubahan

### Migration baru — `manual_payment_proofs` RLS
1. **SELECT** — tambah policy "Admin cabang can view branch proofs":
   ```
   EXISTS (
     SELECT 1 FROM bookings b
     WHERE b.id = manual_payment_proofs.booking_id
       AND is_admin_cabang_for(b.branch)
   )
   ```
2. **UPDATE** — tambah policy serupa agar admin cabang bisa approve/reject bukti untuk booking di cabangnya (USING + WITH CHECK).
3. Policy `staff`/`admin` yang lama tetap ada (CS Pusat aman).

### Tidak ada perubahan kode UI
- `TransferProofButton`, `PaymentsManager`, `BookingsManager`, `TransactionHistory` sudah memakai RLS Supabase; begitu policy ditambahkan, admin cabang otomatis melihat tombol & isi bukti.
- Bucket `payment-proofs` sudah public read (tidak perlu diubah).

## Verifikasi
1. Login sebagai user dengan role `admin_cabang` (assigned_branch tertentu).
2. Buka /dashboard/keuangan/payment, /dashboard (bookings), dan transaksi history.
3. Pastikan tombol "Bukti · Verifikasi" muncul untuk booking di cabang tersebut dan dialog menampilkan gambar bukti.
4. Pastikan tombol Konfirmasi/Tolak berhasil mengubah status proof.
5. Login user `admin_cabang` cabang lain — bukti booking cabang yang bukan miliknya **tidak** muncul.
