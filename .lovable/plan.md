## Tujuan

1. Hapus fitur **Permintaan Koreksi** sepenuhnya (menu, halaman, dialog, tabel DB, RPC).
2. Semua role admin (owner, admin, admin_cabang, staff) dapat **edit transaksi** langsung: cabang, tanggal, jam, data kendaraan, kontak, dsb. **Flow status booking dan payment tetap forward-only** — trigger DB yang ada dipertahankan; kalau ada percobaan mundur, hanya toast peringatan (tidak lagi memunculkan alur koreksi).
3. Saat admin akan **membatalkan booking** (status → `cancelled`) atau menyetujui permintaan cancel dari customer, munculkan dialog "**Edit transaksi terlebih dahulu?**" untuk mencegah pola batal-lalu-input-ulang oleh customer yang sama.

## Perubahan

### A. Hapus Permintaan Koreksi

**Frontend**
- `src/config/dashboardMenu.ts` — hapus item menu `Permintaan Koreksi` (line 220) dan aturan section `/dashboard/correction-requests` (line 86). Sisakan keyword lain di rule generik tetap OK.
- `src/config/pageRegistry.ts` — hapus baris `/dashboard/correction-requests`.
- `src/pages/Admin.tsx` — hapus import `CorrectionRequestsPanel` dan route `correction-requests`.
- `src/components/admin/DashboardHomeBlocks.tsx` — hapus state `correctionRequests`, query `correction_requests`, dan tile `Permintaan koreksi`.
- `src/components/admin/BookingsManager.tsx`:
  - Hapus import `RequestCorrectionDialog` dan state `correctionTarget`.
  - Hapus render `<RequestCorrectionDialog …>` di bawah.
  - Ganti empat cabang `setCorrectionTarget(...)` (di `setPaymentStatus`, `updateStatus`, dua fallback error `FORWARD_ONLY_*`) menjadi `toast({ variant: "destructive", title: "Status terkunci", description: "..." })`. Aturan forward-only tetap berlaku, tapi tidak lagi menawarkan alur koreksi.
- Hapus file:
  - `src/components/admin/CorrectionRequestsPanel.tsx`
  - `src/components/admin/RequestCorrectionDialog.tsx`

**Backend (migration)**
- `DROP TABLE public.status_change_requests CASCADE;`
- `DROP FUNCTION` untuk RPC yang terkait (approve/reject correction) jika ada. Cek dulu di migrations lama; drop yang teridentifikasi.
- **Jangan** hapus trigger `FORWARD_ONLY_BOOKING_STATUS` / `FORWARD_ONLY_PAYMENT_STATUS` — sesuai permintaan "flow status tidak berubah". Cukup ubah pesan RAISE agar tidak lagi menyebut "Ajukan koreksi ke Owner" — diganti "Status tidak dapat dimundurkan".

### B. Semua role bisa Edit Transaksi

- `src/components/admin/BookingsManager.tsx`:
  - Ganti gate `{isStaff && ( … dropdown edit/delete … )}` menjadi izin untuk semua admin/staff (kondisi tetap `isStaff` karena hook `useUserRole` sudah true untuk `admin`, `admin_cabang`, `staff`, `owner`).
  - Pastikan tombol **Edit Transaksi** juga tersedia di action row untuk role non-owner. Tidak perlu perubahan lain karena `handleOwnerEdit` sudah generic.
- `src/components/admin/EditBookingDialog.tsx`:
  - **Sembunyikan field `status`** (dan biarkan payload tidak mengirim `status`) supaya edit di form ini murni untuk data operasional. Perubahan status tetap lewat dropdown baris → mengikuti trigger forward-only.
  - Field `payment_status` juga di-hide untuk non-owner (biarkan diubah lewat kontrol khusus). Tidak wajib — bisa dipertahankan; keputusan minimal: hilangkan `status` dari form Edit.

### C. Dialog "Edit dulu?" sebelum cancel

- Buat komponen kecil `EditBeforeCancelDialog.tsx` (AlertDialog) dengan pesan:
  > "Untuk menghindari input ulang oleh customer yang sama, apakah Anda ingin mengedit transaksi ini (misal ubah tanggal/jam/cabang) daripada membatalkannya?"
  > Tombol: **Edit Transaksi** (primer) · **Tetap Batalkan** (destructive) · **Kembali**.
- Titik pemicu di `BookingsManager.tsx`:
  1. `updateStatus(id, "cancelled")` — sebelum eksekusi, tampilkan dialog. Bila pilih **Edit Transaksi** → `setEditTarget(booking)`; bila **Tetap Batalkan** → lanjutkan update ke `cancelled`.
  2. `approveCancellation(id)` (approve cancel-request customer) — tampilkan dialog serupa dengan copy yang menyebut "customer meminta pembatalan". Pilihan sama.
- Tidak diblok di komponen customer-side; hanya di admin dashboard.

### D. Verifikasi

- Menu **Permintaan Koreksi** hilang dari sidebar untuk semua role.
- Route `/dashboard/correction-requests` menjadi 404 / redirect default.
- Admin cabang / staff dapat membuka **Edit Transaksi** dari baris booking dan mengubah cabang, tanggal, jam, plat, dll.
- Klik batalkan booking → dialog "Edit dulu?" muncul, dua alur berjalan.
- Coba mundurkan status via dropdown → toast "Status terkunci" (tanpa ajakan koreksi), booking tetap seperti semula.

## Detail Teknis (ringkas)

```text
Files removed
  src/components/admin/CorrectionRequestsPanel.tsx
  src/components/admin/RequestCorrectionDialog.tsx

Files edited
  src/config/dashboardMenu.ts
  src/config/pageRegistry.ts
  src/pages/Admin.tsx
  src/components/admin/DashboardHomeBlocks.tsx
  src/components/admin/BookingsManager.tsx  (state + dialog + cancel intercept)
  src/components/admin/EditBookingDialog.tsx (hide status field)

File added
  src/components/admin/EditBeforeCancelDialog.tsx

Migration
  DROP TABLE public.status_change_requests CASCADE;
  DROP FUNCTION public.approve_status_change_request(uuid);
  DROP FUNCTION public.reject_status_change_request(uuid, text);
  -- Ubah pesan RAISE pada trigger FORWARD_ONLY_* (opsional, cosmetic).
```

## Cakupan yang TIDAK berubah

- Aturan forward-only untuk booking status & payment status (DB trigger tetap).
- Alur checkout, notifikasi, payment, invoice.
- Role-based access ke edge functions lain.
