## Objective
Hilangkan peran **QC** dari seluruh domain SPK. Flow final check dilakukan oleh **Mekanik** langsung. Flow akhir: **Admin → Customer (User) → Mekanik**.

## Target flow (3 aktor)
```text
Draft (Admin) → Awaiting Customer Approval (Customer) → Mechanic Final Check (Mekanik) → Closed
```
Sebelumnya `qc_pending` diselesaikan oleh actor `qc`. Sekarang status yang sama diselesaikan oleh actor `mekanik` (status enum tetap `qc_pending` untuk kompatibilitas DB, hanya labelnya "Final Check Mekanik").

## Perubahan (UI + Metadata only, tanpa mengubah enum DB)

### 1. Workflow transitions (metadata)
- Migration ringan pada `spk_workflow_transitions` untuk `spk_default`:
  - Semua transition `actor_role = 'qc'` → di-remap menjadi `'mekanik'`.
  - Hapus baris duplikat bila mekanik sudah punya transition setara.
- Tidak menyentuh enum `spk_workflow_actor` (aman: nilai `qc` tetap ada tapi tidak dipakai).

### 2. Role Profiles (`src/runtime/form/RoleProfiles.ts` + seed `spk.role_profiles` di `app_settings`)
- Profile `mekanik.workflow_roles`: tambahkan alias `["mekanik", "qc"]` supaya WorkflowEngine tetap menerima transition legacy `qc` bila masih ada di DB lain.
- Hapus profile `qc` dari default seed. Bila record `qc` masih ada di `app_settings`, biarkan (backward-safe) — Runtime tidak akan memanggilnya lagi.

### 3. `useUserRole` → SpkActor mapping (`SPKCanvas.tsx`)
- Semua mapping yang menghasilkan `"qc"` diganti ke `"mekanik"`.

### 4. Approval Card (`src/components/spk/canvas/ApprovalCard.tsx`)
- Signature field `signature_qc` → **`signature_mekanik`** (label "Mekanik – Final Check").
- Read-back di `SPKPrint.tsx` dan `SPKCustomerApprove.tsx`: baca `signature_mekanik` dengan fallback ke `signature_qc` (data lama tetap tampil).
- `filteredChecks` "requires: qc" → "requires: mekanik". Approval matrix flag `qc_required` di-rename secara UI menjadi `final_check_required` (fallback membaca key lama untuk data yang sudah ada).

### 5. WorkflowEngine bypass approve di Canvas
- Tombol "Approve Customer di Device Bengkel (Bypass)" dan `StaffRevisionEscape`: ganti destinasi status tetap `qc_pending`, tapi label & role guard menggunakan mekanik (bukan qc).

### 6. Labels & badge (`src/lib/spk/eventLabels.ts`, badge status di `SPKWorkQueue.tsx`, `SPKAllList.tsx`, `CustomerSPKCard.tsx`, `SPKCustomerApprove.tsx`)
- `qc_pending` → label "Final Check Mekanik".
- `qc_passed` → label "Selesai Diperiksa Mekanik".
- Hapus istilah "QC" dari copy user-facing.

### 7. Configuration Panel (`SPKConfigurationPanel` + `SPKWorkflowViewer`)
- Baris konfigurasi role "QC" dihapus dari UI editor. Editor hanya menampilkan: Admin, Admin Cabang, Mekanik, Customer, Staff.
- Approval Matrix: rename toggle "QC Required" → "Final Check Required" (baca/tulis key lama demi backward compat).

### 8. Automation & Timeline
- `AutomationBootstrap.ts` / `eventLabels.ts`: rename display "QC" → "Mekanik". Tidak mengubah event_type.

## Migration SQL (ringkas)
```sql
-- Pindahkan actor_role qc → mekanik pada workflow default; skip duplikat.
UPDATE public.spk_workflow_transitions t
SET actor_role = 'mekanik'
WHERE actor_role = 'qc'
  AND NOT EXISTS (
    SELECT 1 FROM public.spk_workflow_transitions x
    WHERE x.workflow_id = t.workflow_id
      AND x.from_status = t.from_status
      AND x.to_status   = t.to_status
      AND x.actor_role  = 'mekanik'
  );
DELETE FROM public.spk_workflow_transitions WHERE actor_role = 'qc';
```

## Backward Compatibility
- Enum `spk_workflow_actor` **tidak diubah** — data historis (event.actor_role='qc', signature_qc) tetap terbaca.
- Baca signature: `signature_mekanik ?? signature_qc`.
- Approval matrix membaca `final_check_required ?? qc_required`.

## Verifikasi
1. `tsgo` untuk memastikan tipe rapi setelah rename konstanta.
2. Playwright: buka SPK yang berada di `qc_pending` sebagai mekanik → tombol "Selesaikan Final Check" muncul → transisi ke `closed_pending` sukses.
3. Cek badge/label di `SPKWorkQueue`, `CustomerSPKCard`, halaman approve customer, dan PDF print.
4. Cek halaman `/dashboard/spk/configuration` — role QC tidak lagi muncul.

## Scope yang **tidak** disentuh
- Struktur tabel dan enum DB (aman, tidak breaking).
- Logika RuntimeBus, AutomationEngine, EventEngine.
- Flow customer approval RPC (`customer_approve_spk`, `customer_request_spk_revision`).
