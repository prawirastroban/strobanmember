## Masalah

1. **Mechanic tidak melihat Finalisasi Card** (form catatan mekanik, tanda tangan, ringkasan waktu).
   
   Root cause: `FinalizationCard` dibungkus `<CanvasSection id="sec-finalization" …>`. `CanvasSection` menurunkan `sectionCode = "finalization"` lalu memanggil `resolveSectionAccess(role, "finalization")`. Konfigurasi role_profiles di `app_settings` (dan default) TIDAK mengandung `"finalization"` di scope `visible` mekanik — hanya ada `notes`, `time`, `approval`, dst. Sehingga `scope.visible = false` → seluruh card `return null`. Card ini muncul di role admin/owner karena mereka memakai `visible: "*"`, tetapi hilang khusus untuk mekanik. Screenshot user cocok dengan gejala ini (Battery → langsung AI Health card, tanpa Finalisasi).

2. **Role `head_mekanik` masih terpasang** tetapi user ingin flow ringkas: hanya owner/staff, admin, admin_cabang, mekanik, customer.

## Perbaikan

### A. Fix visibilitas Finalisasi Card

- `src/pages/spk/SPKCanvas.tsx`
  - Ganti `id: "sec-finalization"` di `SECTIONS` menjadi `id: "sec-notes"` (sudah cocok dengan scope role_profiles mekanik: `notes` termasuk visible & editable).
  - Update `requires` menjadi `["mechanic_note", "signature_mekanik"]` (tetap).
- `src/components/spk/canvas/FinalizationCard.tsx`
  - Ganti `<CanvasSection … id="sec-finalization">` menjadi `id="sec-notes"` supaya scope binding mekanik memberi `visible=true, editable=true`.
  - Judul & subtitle dipertahankan ("Finalisasi Pengerjaan").
  - Guard early-return `if (!notes.visible && !time.visible)` dipertahankan sebagai safety net.
- Hasil: mekanik akan melihat kembali blok **Catatan Mekanik**, **Tanda Tangan Mekanik** (via `SignaturePadBound`), dan **Ringkasan Waktu Pengerjaan** — semuanya di dalam satu card di atas AI Health.
- Tidak perlu menyentuh seed `app_settings.spk.role_profiles` (perubahan murni di kode / mapping id).

### B. Hapus role `head_mekanik`

Strategi aman: hentikan penggunaan di kode, migrasikan semua user aktif ke `mekanik`, biarkan enum value tetap ada di DB (Postgres tidak mendukung `DROP VALUE` — mencabutnya akan menghancurkan histori). Enum value yang tidak dipakai tidak menimbulkan efek samping.

**Migrasi DB** (SQL, satu file baru):
```sql
UPDATE public.user_roles SET role = 'mekanik' WHERE role = 'head_mekanik';
```

**Kode yang diedit** (hapus flag `isHeadMekanik` dan semua percabangannya, ganti semua kondisi `head_mekanik` → langsung `mekanik`):
- `src/hooks/useUserRole.ts` — buang `isHeadMekanik`, `head_mekanik` dari enum, sederhanakan `isSpkOnly`, `isCustomer`, `isAdminOrStaff`.
- `src/pages/spk/SPKCanvas.tsx` — hapus cabang `if (isHeadMekanik)`.
- `src/pages/spk/SPKNewForm.tsx` — hapus referensi.
- `src/components/admin/UserRolesManager.tsx` — hapus opsi "Head Mekanik Cabang" dari picker.
- `src/components/admin/CustomerList.tsx` & `EditCustomerDialog.tsx` — hilangkan opsi filter/assign.
- `src/config/dashboardMenu.ts` — buang gating khusus head_mekanik.
- `src/pages/Admin.tsx` — sederhanakan role guard.
- `supabase/functions/admin-user-ops/index.ts` — hapus `head_mekanik` dari allowed roles.
- `src/runtime/form/RoleProfiles.ts` / `DEFAULT_WORKFLOW_ROLES` — tidak ada referensi head_mekanik saat ini, biarkan.
- `src/integrations/supabase/types.ts` — auto-generated, tidak diedit manual.

### C. Verifikasi

- Buka `/spk/:id` sebagai akun mekanik → Finalisasi Card tampil di bawah tab Estimasi berisi: Catatan Mekanik, Catatan Jeda, PhotoDropzone, Tanda Tangan Mekanik, Ringkasan Waktu Pengerjaan.
- Progress bar tetap menghitung `mechanic_note` + `signature_mekanik` (metadata `sec-notes` sudah `requires` keduanya).
- Cek `useUserRole` di halaman dashboard: tidak ada lagi runtime error terkait `isHeadMekanik`.
- Cek DB: `select role, count(*) from user_roles group by role;` — tidak ada baris `head_mekanik` tersisa.

## Catatan Teknis

- Perubahan id `sec-finalization` → `sec-notes` konsisten dengan konvensi SectionCode di `RoleProfiles.ts`; tidak memerlukan update pada `app_settings` karena `notes` sudah ada di scope mekanik dari seed lama.
- Enum `head_mekanik` yang tersisa di database tidak dipakai; jika kelak ingin benar-benar dihapus dari enum, itu memerlukan migrasi berulir (rename → create new → migrate columns → drop) yang di luar scope perbaikan cepat ini.
