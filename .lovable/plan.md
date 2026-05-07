# Batasi filter cabang untuk Admin Cabang

## Masalah
Saat ini Admin Cabang (mis. Tasikmalaya) sudah dibatasi di level database (RLS `is_admin_cabang_for`), tetapi UI di `/dashboard` masih menampilkan dropdown cabang penuh dari `useBranches()`. Akibatnya user bisa memilih cabang lain di filter walau datanya kosong — membingungkan dan rawan kesalahan operasional.

## Tujuan
Setiap filter / pemilih cabang di seluruh fitur dashboard otomatis:
- Hanya menampilkan **cabang yang ditugaskan** untuk role `admin_cabang`.
- Default & terkunci ke cabang tersebut (tidak bisa pilih "Semua" atau cabang lain).
- Untuk role `staff` (Owner) dan `admin` (CS Pusat) tetap melihat semua cabang.

## Pendekatan
Buat hook tunggal sebagai sumber kebenaran agar konsisten di seluruh komponen.

### 1. Ekstensi `src/hooks/useBranches.ts`
Tambahkan hook baru `useScopedBranches()` yang menggabungkan `useBranches()` + `useUserRole()`:
- Jika `isAdminCabang && userBranch`: kembalikan hanya cabang yang `slug` (atau `name`) cocok dengan `userBranch`.
- Selain itu kembalikan seluruh daftar cabang aktif.
- Mengembalikan juga `isLocked: boolean` dan `lockedBranch: string | null` agar komponen tahu harus mengunci dropdown.

### 2. Update komponen filter cabang
File yang memakai `useBranches()` untuk filter/pemilih cabang diganti ke `useScopedBranches()`:
- `src/components/admin/BookingsManager.tsx` — filter cabang booking
- `src/components/admin/TransactionHistory.tsx` — filter cabang transaksi
- `src/components/admin/CustomerList.tsx` — filter cabang customer
- `src/components/admin/SlotsManager.tsx` — pemilih cabang slot
- `src/components/admin/reports/ReportFilters.tsx` — filter laporan
- `src/components/admin/QuickBookingDialog.tsx` — pemilih cabang booking
- `src/components/admin/StaffQuickBookingDialog.tsx` — pemilih cabang booking
- `src/components/admin/EditCustomerDialog.tsx` — pemilih cabang assigned

Perilaku per komponen ketika `isLocked`:
- Set state filter awal = `lockedBranch` (bukan `"all"`).
- Sembunyikan opsi "Semua Cabang".
- Tampilkan trigger `Select` dengan `disabled` + label "Cabang: <nama>" (atau cukup sembunyikan dropdown jika hanya 1 opsi).
- Untuk dialog input baru (Quick Booking, Edit Customer) — paksa value = lockedBranch dan disable.

### 3. Halaman ringkasan / list yang query langsung
Beberapa list mengandalkan RLS untuk membatasi data, sehingga tidak perlu perubahan logika query. Yang penting: filter UI tidak boleh mengirim slug cabang lain (karena akan mengembalikan kosong dan terlihat seperti bug).

### 4. AdminSidebar
Sudah menampilkan "Cabang: {userBranch}" — biarkan, tidak ada perubahan.

### 5. Memory
Tambahkan memory `mem://features/branch-scoped-filters` berisi rule:
- Selalu pakai `useScopedBranches()` untuk filter/pemilih cabang di area dashboard.
- Admin Cabang: dropdown cabang dikunci ke `userBranch`, tanpa opsi "Semua".

## Detail teknis (untuk implementor)
- `userBranch` di `useUserRole` berisi `profiles.assigned_branch` (string — biasanya slug).
- Cocokkan dengan `branch.slug` terlebih dahulu, fallback ke `branch.name` agar toleran pada data lama.
- RLS sudah men-enforce di server, jadi perubahan ini murni UX guardrail di klien.
- Tidak perlu migrasi DB.

## Hasil
Admin Cabang Tasikmalaya membuka tab apapun di `/dashboard` → semua filter cabang otomatis terkunci di "Tasikmalaya"; tidak ada cara di UI untuk memilih cabang lain.
