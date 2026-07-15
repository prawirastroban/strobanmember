## Objective
Add new role **`head_mekanik`** (Head Mekanik Cabang) yang bertugas review ulang SPK yang sudah dikerjakan mekanik. Sekaligus batasi role **`mekanik`** dan **`head_mekanik`** agar sidebar dashboard hanya menampilkan **SPK / Work Order**.

## Scope changes

### 1. Database (migration)
- Tambah nilai `'head_mekanik'` ke enum `public.app_role`.
- Tidak menambah tabel; role tetap disimpan di `user_roles` (aman).
- Tidak menyentuh RLS spk_orders (head_mekanik akan lolos via policy admin_cabang jika perlu — akan diperiksa dan disamakan seperti mekanik).

### 2. Role hook — `src/hooks/useUserRole.ts`
- Extend `AppRole` union dengan `"head_mekanik"`.
- Tambah flag `isHeadMekanik`.
- Update `isCustomer` dan `isAdminOrStaff` untuk memasukkan role baru.
- Ekspor flag baru untuk gating.

### 3. Sidebar / Menu — `src/config/dashboardMenu.ts` + `src/components/admin/AdminSidebar.tsx`
- `RoleFlags`: tambah `isMekanik`, `isHeadMekanik`.
- Tambah `RequiredRole` baru: `"spk_only_hidden"` — item disembunyikan bila role adalah mekanik/head_mekanik (kecuali entry SPK).
- Tandai semua top-level items **selain "SPK / Work Order"** dengan flag itu.
- Untuk SPK children yang saat ini `requiredRole: "owner"` (Templates, Automation, Configuration), tetap tersembunyi bagi mekanik/head_mekanik.
- AdminSidebar: sembunyikan tombol **Dashboard** (root) bagi mekanik/head_mekanik → langsung landing ke `/dashboard/spk`.
- `passesRole` diperluas untuk aturan baru.

### 4. SPK Canvas mapping — `src/pages/spk/SPKCanvas.tsx`
- Map `head_mekanik` → SpkActor `"mechanic"` (untuk sekarang berbagi transitions), TAPI tambah alias workflow di `DEFAULT_WORKFLOW_ROLES`:
  - `head_mekanik: ["mechanic","qc","admin_cabang"]` — supaya bisa melakukan final check ulang.
- Alternatif: role dedicated `"head_mechanic"` di `SpkActor`. Pilih pendekatan alias agar tidak memaksa perubahan luas pada types & workflow definitions.

### 5. Role Profiles — `src/runtime/form/RoleProfiles.ts`
- Tambah default profile `head_mechanic` (alias mechanic) dengan `visible: "*"` dan `editable` mencakup semua section review + `approval` (agar bisa tanda tangan final QC/mekanik).
- Update `DEFAULT_WORKFLOW_ROLES` untuk mekanik agar tidak berubah.

### 6. Landing redirect
- `src/pages/Admin.tsx`: tambah komponen `SpkOnlyRedirect` — jika user `isMekanik || isHeadMekanik` dan mereka membuka route non-SPK (misal `/dashboard`, `/dashboard/bookings`), redirect ke `/dashboard/spk`.
- Rute SPK tetap dapat diakses.

### 7. User Roles Manager UI — `src/components/admin/UserRolesManager.tsx`
- Tambah pilihan role "Head Mekanik Cabang" di dropdown assign role (branch-scoped, sama seperti mekanik).
- `src/lib/adminUserOps.ts` + edge function `admin-user-ops`: whitelist role baru `head_mekanik`.

### 8. i18n & label — `src/i18n/id.ts`
- Tambah label "Head Mekanik Cabang" untuk role.

### 9. Cosmetic
- SPKConfigurationPanel: role list Roles tab menampilkan entry baru (`head_mechanic`).

## Non-goals
- Tidak menambah fitur baru di dalam SPK (audit head mekanik dilakukan lewat aksi `mechanic` yang sudah ada — di iterasi berikutnya bisa dipisah bila diminta).
- Tidak mengubah workflow transitions DB. Head Mekanik menggunakan actor `mechanic` via alias.
- Tidak memodifikasi Navbar customer (mekanik/head_mekanik tetap tanpa akses customer views).

## Verification
1. Login sebagai user role `mekanik` → sidebar hanya menampilkan grup "Operasional" dengan **SPK / Work Order**, root `Dashboard` tersembunyi, membuka `/dashboard/bookings` di-redirect ke `/dashboard/spk`.
2. Sama untuk `head_mekanik`.
3. Assign role via UserRolesManager sukses.
4. Head mekanik bisa membuka SPK, melakukan Final Check dan tanda tangan mekanik (aksi tetap masuk sebagai actor `mechanic`).
5. Build clean (typecheck lulus).