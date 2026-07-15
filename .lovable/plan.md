## Tujuan
Batasi role **Mekanik** dan **Head Mekanik** agar:
1. Tidak dapat membuat SPK baru (UI + guard route + server RLS).
2. Hanya melihat & memproses SPK milik cabang yang ditugaskan (`profiles.assigned_branch`).

## Perubahan UI (Frontend)

**1. Sembunyikan aksi "Buat SPK Baru"**
- `src/pages/Admin.tsx` — saat mendaftarkan route `SPKAllList`, jangan kirim prop `actions` (tombol Buat SPK Baru) bila `isMekanik || isHeadMekanik`.
- `src/pages/spk/admin/SPKAllList.tsx` — sembunyikan tombol "+ Buat SPK Baru" & "Buka Queue" untuk role tersebut. Juga sembunyikan tombol Edit/Hapus per-card (biarkan hanya untuk staff/admin/admin_cabang seperti sekarang).
- `src/pages/spk/admin/SPKNewPage.tsx` — jika user mekanik/head_mekanik, redirect ke `/dashboard/spk/all` dengan toast "Tidak memiliki akses".
- `src/pages/spk/SPKNewForm.tsx` — guard yang sama di awal komponen.
- `src/components/admin/BookingsManager.tsx` — trigger `SPKService.createFromBooking` saat status → `in_progress` hanya boleh berjalan untuk `staff | admin | admin_cabang`. Untuk mekanik/head_mekanik, ubah status tetap boleh tapi lewati pembuatan SPK (SPK dibuat oleh admin/CS).
- `src/config/dashboardMenu.ts` — pastikan menu "Buat SPK" (jika masih ada shortcut) tidak muncul untuk role ini.

**2. Filter daftar SPK ke cabang mekanik**
- `src/pages/spk/admin/SPKAllList.tsx` — gunakan `useScopedBranches()` (sudah ada pola untuk admin_cabang). Perluas hook `useScopedBranches` di `src/hooks/useBranches.ts` agar juga mengunci branch untuk `isMekanik || isHeadMekanik` berdasarkan `assigned_branch` (identik dengan logika admin_cabang).
- Filter query `spk_orders` di SPKAllList: gabungkan `branch_id` = branch mekanik. Dropdown filter cabang disable & terkunci.

**3. Canvas SPK (proses)**
- `src/pages/spk/SPKCanvas.tsx` — tetap dapat diakses; tidak perlu perubahan aksi selain memastikan mekanik/head_mekanik tidak melihat aksi non-mekanik (sudah ditangani RoleProfiles). Tambah guard: jika SPK bukan cabang mekanik → redirect + toast "SPK di luar cabang Anda".

## Perubahan Backend (RLS)

Migration untuk `spk_orders`:
1. **INSERT policy** — pisahkan agar `mekanik` dan `head_mekanik` **tidak** ada di klausa `WITH CHECK`. Hanya `staff | admin | admin_cabang (branch match)` yang boleh insert.
2. **SELECT / UPDATE policy** — tambahkan cabang-scope untuk `mekanik` & `head_mekanik`: hanya baris dengan `branch_id` yang cocok dengan `profiles.assigned_branch` mereka (via helper function `public.is_branch_member(uid, branch_id)` bila belum ada, atau reuse `is_admin_cabang_for` dengan varian baru).
3. Tidak mengubah policy untuk role lain.

## Verifikasi
- Login sebagai mekanik → `/dashboard/spk/all` hanya menampilkan SPK cabangnya; tombol Buat SPK & Edit/Hapus hilang; akses `/spk/new` di-redirect.
- Login sebagai admin_cabang → perilaku tidak berubah.
- Percobaan INSERT `spk_orders` sebagai mekanik lewat client harus ditolak oleh RLS.

## Catatan Scope
Tidak ada perubahan pada Workflow/Automation/AI. Hanya visibility, guard, dan RLS.
