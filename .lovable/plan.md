# Tampilkan Cabang untuk Admin Cabang + Rapikan Filter

## Tujuan
1. Setiap user dengan role **Admin Cabang** menampilkan nama cabang yang ditugaskan (mis. "Admin Cabang • Kuningan").
2. Filter bar di `/dashboard/customers` lebih rapi & fleksibel — termasuk dropdown filter cabang yang sebelumnya sudah ada state-nya (`branchFilter`) tapi belum dirender.

## Perubahan pada `src/components/admin/CustomerList.tsx`

### Data
- Tambahkan field `assigned_branch: string | null` pada `CustomerRow`. Sudah di-`select` dari `profiles` (`assigned_branch`) tapi belum dipakai — tinggal di-map ke row.
- Buat lookup `branchNameMap` dari hook `useBranches()` (id → name).

### Tampilan role
- Pada **Desktop table** (kolom Role) dan **Mobile card** (badge role):
  - Jika `c.role === 'admin_cabang'`, render badge `Admin Cabang` + sub-label kecil `• <Nama Cabang>` (atau `• Belum diset` kalau null, warna muted/destructive).
  - Role lain tetap.

### Filter bar
- Tambah dropdown **Cabang** (muncul hanya jika daftar `branches` > 0 dan roleFilter mencakup admin_cabang/all/staff_or_admin), opsi: `Semua Cabang` + setiap cabang dari `useBranches()`.
  - Disabled state ketika `roleFilter` di-set ke role yang bukan admin_cabang/all (visual: tetap terlihat tapi tidak aktif), supaya tetap "fleksibel".
- Logika `filtered` di-extend: jika `branchFilter !== 'all'`, hanya lolos row dengan `assigned_branch === branchFilter`.
- Reset filter juga mereset `branchFilter` (sudah ada).

### Kerapian visual
- Pindahkan tombol **Refresh** ke dalam `FilterBar` lewat slot `exportButton` agar sejajar di kanan (menghilangkan baris ekstra `div.flex.justify-end mb-3`).
- Urutan chip role tetap: Semua / Customer / CS Pusat / Admin Cabang / Staff.
- Urutan dropdown: Verifikasi → WA → Status → **Cabang** (baru, paling kanan).

## Catatan teknis
- Tidak ada perubahan skema DB — kolom `profiles.assigned_branch` sudah ada.
- Tidak menyentuh logika role/RLS.
- Tidak ada perubahan API edge function.

## File yang disentuh
- `src/components/admin/CustomerList.tsx` (satu-satunya file).
