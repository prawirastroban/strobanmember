## Tujuan
Tambahkan tombol aksi khusus untuk role **staff** (dan admin) agar bisa **Edit** dan **Hapus** SPK yang sudah ada, langsung dari daftar antrian `/spk`. Role lain (mekanik, customer) tidak melihat tombol ini.

## Perubahan

### 1. `src/pages/spk/SPKWorkQueue.tsx`
- Import `useUserRole` untuk mendeteksi role aktif.
- Tambahkan flag `canManage = role === 'staff' || role === 'admin' || role === 'admin_cabang'`.
- Di `SpkCardItem`, tambahkan prop `canManage`, `onEdit`, `onDelete`.
- Render dua tombol kecil di pojok kanan bawah card (hanya bila `canManage`):
  - **Edit** (icon `Pencil`) → `navigate('/spk/{id}')` (Canvas sudah editable untuk staff).
  - **Hapus** (icon `Trash2`, warna destructive) → buka `AlertDialog` konfirmasi.
- `stopPropagation` pada tombol agar tidak memicu klik card.

### 2. Konfirmasi hapus
- Gunakan komponen `AlertDialog` (shadcn) untuk konfirmasi "Hapus SPK {nomor}? Tindakan ini tidak dapat dibatalkan."
- Soft delete: `UPDATE spk_orders SET deleted_at = now() WHERE id = ?` via supabase client.
- Toast sukses/error (`sonner`), lalu trigger `setReloadTick` supaya list refresh (realtime channel juga akan menangkap).

### 3. Guard di UI saja
- RLS `spk_orders` sudah membatasi update ke staff/admin — tidak ada perubahan schema/policy.
- Tombol hanya muncul untuk role yang berwenang; percobaan hapus oleh role lain akan tetap ditolak backend.

## Non-goals
- Tidak mengubah workflow, runtime, canvas, atau schema database.
- Tidak menambah halaman edit terpisah (Canvas existing sudah menangani edit).
- Tidak mengubah tampilan untuk role customer/mekanik.
