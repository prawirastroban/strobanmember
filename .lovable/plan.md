## Masalah

`admin_cabang` (dan secara tidak sengaja gate awal di edge function) **gagal** membuat customer baru lewat **Quick Booking**, sehingga "New Customer" tidak bisa dipakai oleh Admin Cabang / CS Pusat di beberapa kasus.

Akar masalahnya ada di `supabase/functions/admin-user-ops/index.ts` baris 125:

```ts
if (!isStaff && !isAdmin) {
  return 403 Unauthorized
}
```

Gate global ini **memblokir `admin_cabang` lebih dulu** sebelum sampai ke per-action check di bawahnya (`canManageCustomer` yang sudah mengizinkan admin_cabang). Akibatnya action `create_customer` tidak pernah jalan untuk role admin_cabang.

RLS `bookings` & `tire_orders` sendiri sudah benar:
- `Staff can insert bookings` → admin + staff
- `Admin cabang can insert branch bookings` → admin_cabang untuk branch-nya
Jadi insert booking/tire order tidak perlu diubah.

## Perubahan

### 1. `supabase/functions/admin-user-ops/index.ts`
Ganti gate global agar mengizinkan ketiga role admin, lalu biarkan setiap action menegakkan permission spesifiknya (yang sudah ada):

```ts
if (!isStaff && !isAdmin && !isAdminCabang) {
  return 403 Unauthorized
}
```

Tidak ada perubahan lain — `create_customer` sudah memakai `canManageCustomer` (staff || admin || admin_cabang). Action sensitif lain (`set_role`, `delete_user`, dll) sudah punya gate sendiri (`isStaff` only), jadi tetap aman.

### 2. Verifikasi `StaffQuickBookingDialog`
Hanya read-only check: pastikan dialog hanya memanggil `admin-user-ops` (`create_customer`) + `bookings.insert` / cart-checkout. Tidak ada perubahan kode klien yang perlu — setelah fix #1, admin_cabang & CS pusat (admin) sudah dapat:
- buat customer baru,
- insert booking untuk cabang mereka (RLS sudah lulus).

### 3. Deploy edge function
Redeploy `admin-user-ops` setelah perubahan.

## Pengujian

1. Login sebagai admin_cabang → Dashboard → Pesan Servis → New Customer → submit. Harus sukses (sebelumnya 403).
2. Login sebagai admin (CS Pusat) → ulangi. Harus sukses (sudah jalan, regression check).
3. Login sebagai staff (Owner) → ulangi. Harus tetap sukses.
4. Pastikan booking ter-insert dengan `branch` = cabang admin_cabang (RLS akan menolak branch lain — biarkan saja, itu memang sesuai aturan scope).

## Yang TIDAK diubah

- RLS bookings / tire_orders (sudah benar).
- Gate per-action lain (`set_role`, `delete_user`, dll tetap staff-only).
- UI Quick Booking.
