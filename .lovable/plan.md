# Perbaikan: Admin Cabang Tidak Bisa Edit Slot & Upload Bukti Bayar

Dari dua error di gambar:

1. `new row violates row-level security policy for table "booking_slots"` saat admin cabang menyimpan kapasitas slot.
2. `Upload gagal: new row violates row-level security policy` saat admin cabang upload bukti pembayaran (Transfer/QRIS).

## Akar Masalah

RLS policy untuk dua resource ini hanya mengizinkan role `admin` dan `staff`, role `admin_cabang` belum dimasukkan:

- Tabel `public.booking_slots` — policy `Staff can insert slots`, `Staff can update slots`, `Staff can delete slots` hanya cek `has_role(uid,'admin') OR has_role(uid,'staff')`.
- Storage `storage.objects` bucket `payment-proofs` — policy `Staff manage all proofs` juga hanya `admin`/`staff`.
- Storage bucket `payment-assets` — policy `Staff manage payment-assets` sama, hanya `admin`/`staff`.

## Rencana Migrasi (hanya RLS, tanpa ubah UI)

Drop & recreate policy berikut, tambahkan `has_role(auth.uid(),'admin_cabang')`:

**`public.booking_slots`**
- `Staff can insert slots` (INSERT) → admin / staff / admin_cabang
- `Staff can update slots` (UPDATE) → admin / staff / admin_cabang
- `Staff can delete slots` (DELETE) → admin / staff / admin_cabang

**`storage.objects`**
- `Staff manage all proofs` (ALL, bucket `payment-proofs`) → admin / staff / admin_cabang
- `Staff manage payment-assets` (ALL, bucket `payment-assets`) → admin / staff / admin_cabang

Policy lain (withdrawal proofs, user upload own proof, view publik) tidak diubah karena di luar lingkup admin cabang.

## Catatan

- UX guardrail `useScopedBranches` sudah mengunci admin cabang ke cabangnya sendiri, jadi pelonggaran RLS ini aman pada level cabang.
- Tidak perlu perubahan kode frontend atau edge function.
