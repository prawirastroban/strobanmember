## Masalah
Tombol "Aktifkan ulang akun belum terkonfirmasi" memanggil action `backfill_unconfirmed` di edge function `admin-user-ops`. Saat ini guard memaksa `isAdmin` saja, sedangkan user yang menekan tombol login sebagai **staff** → server balas `403 {"error":"Hanya admin"}` → muncul toast "Backfill gagal".

## Rencana Perbaikan (minimal, non-destruktif)

1. **`supabase/functions/admin-user-ops/index.ts`**
   - Longgarkan guard `backfill_unconfirmed` agar menerima `isAdmin || isStaff` (sama seperti aksi maintenance lain yang sudah memakai `canManageCustomer`).
   - Tetap aman: operasi hanya menyetel `email_confirm = true` untuk user yang `profiles.is_verified = true`. Tidak ada path baru ke data sensitif.

2. **`src/components/admin/system/SystemAuditPanel.tsx`**
   - Tambahkan guard ringan di UI memakai `useUserRole()` agar kartu "Pemulihan Akun Login" hanya muncul untuk `isAdmin || isStaff` (sembunyikan untuk role lain agar tidak ada klik percuma).
   - Tidak mengubah logika invoke yang sudah ada.

Tidak ada perubahan skema DB, tidak menyentuh AuthContext, dan tidak menambah fitur lain.

## File yang akan disentuh
- `supabase/functions/admin-user-ops/index.ts` (1 blok if)
- `src/components/admin/system/SystemAuditPanel.tsx` (import + conditional render)
