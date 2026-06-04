## Tujuan
Saat ini hanya role **Owner (staff)** yang bisa menekan tombol "Verifikasi User" di panel Customer Management. Role **CS Pusat (admin)** masih dianggap *Read-Only* meskipun edge function backend sudah mengizinkan `admin` untuk action `verify_user`. Kita perlu membuka akses verifikasi untuk CS Pusat.

## Perubahan

### 1. `src/components/admin/CustomerList.tsx`
- Pisahkan menu **"Verifikasi User"** dari blok `isStaff`-only menjadi gate sendiri: tampil untuk `isStaff || isAdmin` (Owner + CS Pusat), tetap disembunyikan untuk Admin Cabang dan customer.
- Aksi sensitif lain (Ubah Role, Reset Password, Hapus Akun) tetap **Owner-only** seperti sekarang.
- Update badge header: bila `isAdmin` (tanpa staff), tampilkan label **"CS Pusat (Verifikasi & Edit)"** dengan ikon `UserCheck`, bukan "Admin (Read-Only)" lagi. Owner tetap "Staff (Full Access)", Admin Cabang tetap variannya saat ini.

### 2. Tidak ada perubahan backend
- `supabase/functions/admin-user-ops/index.ts` sudah meng-allow `admin` untuk `verify_user` (cek di baris 125: `if (!isStaff && !isAdmin)`).
- RPC `verify_user` dipanggil via `callerClient` yang sudah pakai JWT caller; RLS untuk `admin` sudah cukup.

### 3. Tidak menyentuh
- `UserVerification.tsx` (legacy, tombolnya tidak digate oleh role di komponen — sudah pasti jalan untuk admin).
- Role lain (Admin Cabang) — tidak diberi akses verifikasi sesuai konvensi RBAC saat ini.

## Catatan teknis
- File yang berubah: 1 file frontend saja.
- Tidak ada migrasi DB, tidak ada perubahan edge function, tidak ada perubahan memory file yang diperlukan (selain catatan opsional di `customer-management.md` kalau diinginkan setelah build).
