## Tujuan
Owner (role `staff`) dapat menambah (atau menyesuaikan) saldo cashback konsumen secara manual dari panel Dashboard, dengan jejak audit yang lengkap.

## 1. Database — RPC `admin_adjust_cashback`

Fungsi `SECURITY DEFINER` baru yang:
- Cek pemanggil punya role `staff` via `has_role(auth.uid(), 'staff')`. Jika tidak → raise exception (403).
- Validasi input: `_user_id` ada di `profiles`; `_amount > 0`; `_type ∈ ('credit','debit','adjust')` (default `credit`); `_description` wajib (min 3 char); `_expires_at` opsional (default `now() + 365 days` untuk credit, NULL untuk debit/adjust).
- Insert baris ke `cashback_ledger` dengan kolom sesuai, `booking_id`/`promo_id` = NULL.
- Tulis baris audit ke `admin_audit_log` (action baru `cashback.adjust`, target = user_id, metadata = {amount, type, description, expires_at}).
- Return saldo baru via `get_cashback_balance`.

Tipe `debit` dipakai untuk koreksi negatif (misal salah credit), `adjust` untuk penyesuaian netral. Saldo dihitung view `cashback_balances` yang sudah ada — tidak perlu diubah.

Tidak ada perubahan tabel/RLS lain. Tambah enum nilai `'cashback.adjust'` ke `AuditAction` di `src/lib/auditLog.ts`.

## 2. UI — Dialog "Tambah Saldo Cashback"

Komponen baru `src/components/admin/AdminCashbackAdjustDialog.tsx`:
- Trigger: tombol "Tambah Saldo" di **CustomerDetail.tsx** (panel detail pelanggan), hanya muncul jika `isStaff` (Owner). Tampilkan saldo saat ini di atas tombol via `useCashbackBalance`.
- Form fields:
  - Jenis: select [Tambah (credit) / Kurangi (debit) / Penyesuaian (adjust)] — default Tambah.
  - Nominal: `CurrencyInput` (Rp).
  - Alasan/keterangan: textarea wajib (min 3 char, max 200).
  - Masa berlaku (hanya untuk credit): date picker, default `now + 1 tahun`, bisa diosongkan = tidak kedaluwarsa.
- Submit → panggil RPC `admin_adjust_cashback`. Toast sukses + tampilkan saldo baru. Realtime subscription di `useCashbackBalance` otomatis refresh.
- Konfirmasi 2 langkah untuk amount ≥ Rp 500.000 (AlertDialog).

## 3. Riwayat & visibilitas

Di `CustomerDetail.tsx` tambahkan section "Riwayat Saldo Cashback" (collapsible) yang membaca `cashback_ledger` user tersebut — RLS sudah mengizinkan staff/admin. Tampilkan tanggal, tipe, nominal, deskripsi, expires_at; badge warna sesuai tipe.

## 4. Akses

- Tombol & dialog: dibatasi `useUserRole().isStaff` (Owner only). `admin` (CS) tidak melihat tombol.
- Pertahanan kedua: RPC sendiri menolak non-staff via `has_role` — aman walau UI di-bypass.

## Teknis singkat (untuk konteks)

```text
RPC admin_adjust_cashback(_user_id uuid, _amount numeric, _type text,
                          _description text, _expires_at timestamptz)
  returns numeric  -- saldo baru
```

- File baru: `supabase/migrations/<timestamp>_admin_cashback_adjust.sql`, `src/components/admin/AdminCashbackAdjustDialog.tsx`.
- Edit: `src/components/admin/CustomerDetail.tsx`, `src/lib/auditLog.ts`.
- Tidak ada perubahan ke trigger booking-completion, RLS tabel, atau logic checkout.

## Memori
Setelah selesai, simpan ke `mem://features/cashback-wallet` bahwa Owner punya RPC `admin_adjust_cashback` untuk top-up manual dengan jejak `admin_audit_log`.
