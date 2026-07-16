# Hapus Approval dari Canvas SPK

Approval customer & admin sudah diselesaikan di form `/spk/new` (signature admin + customer + paket servis). Canvas kini hanya tempat mekanik mengerjakan → tidak boleh ada lagi UI approval / signature / tunggu-persetujuan.

## Perubahan

### A. `src/components/spk/canvas/FinalizationCard.tsx` — jadikan "Finalisasi" tanpa approval
- Hapus `ApprovalBlock` & `ApprovalCheck` beserta konstanta `CHECKS`.
- Hapus `useSectionBinding("approval")` dan branching `approval.visible`.
- Hapus render `<SignaturePadBound code="signature_mekanik" …>`.
- Subtitle diganti: "Catatan mekanik & ringkasan waktu pengerjaan."
- Header form: judul jadi **"Finalisasi Pengerjaan"** (tetap), tanpa blok Approval.
- Hilangkan import `PenLine`, `CheckCircle2`, `cn`, `SignaturePadBound` yang tak terpakai.

### B. `src/pages/spk/SPKCanvas.tsx` — buang banner & escape approval customer
- Hapus render `<CustomerActionBanners …>` (banner "Menunggu approval customer", tombol "Salin Link Approval", "Kirim Notifikasi ke App").
- Hapus definisi fungsi `CustomerActionBanners` dan komponen turunannya `CustomerBypassApprove` bila hanya dipakai di sini.
- Hapus import `pingCustomerForApproval`, `Send`, `CarFront`, `BellRing`, `PenLine`, `SignaturePad`, `Dialog*` yang jadi tak terpakai.
- Di `FinishActionBar.handleFinish`, hapus auto-scroll ke `#sec-approval` (sudah tidak ada). Tetap validasi runtime (`validateAll`) tapi field wajib approval sudah hilang di section metadata.
- Update `SECTIONS` metadata: hapus entry `sec-approval` (index 11) sehingga total section = 10 dan `runtime.validateAll()` tidak lagi menuntut `approval_as_order` / `approval_clean` / `signature_mekanik`.
- `formatStatus`: label `awaiting_customer_approval` & `pending_approval` dipertahankan (masih ada baris DB lama), tapi tidak lagi memicu UI khusus di canvas.

### C. `src/pages/spk/SPKNewForm.tsx` — pastikan tetap satu-satunya tempat approval
Tidak ada perubahan; hanya verifikasi bahwa signature admin+customer masih diambil di sini (sesuai revisi sebelumnya).

### D. Runtime / Workflow
- `sec-approval` sudah dihapus dari SECTIONS list Canvas → Finalisasi tidak lagi menandai section approval selesai/tidak.
- Tidak menyentuh Workflow engine / EventService / DB. `awaiting_customer_approval` sebagai status DB tetap ada (untuk kompat historis), tetapi Canvas tidak lagi menampilkan alur approval — SPK baru dibuat langsung `in_progress` (sudah sesuai revisi sebelumnya).

## Yang tidak diubah
- FinishActionBar (tombol "Selesaikan SPK") — tetap.
- MechanicTabs (Safety/General/Estimasi) — tetap.
- SPKPrint / PDF — tetap; signature admin & customer tetap tercetak (diambil dari data yang tersimpan saat pembuatan SPK).
- `SPKCustomerApprove` page + RPC — tetap ada untuk backward compat SPK lama; canvas cukup tidak mempromosikannya.

## Verifikasi
1. Buka `/spk/:id` — tidak ada lagi kartu "Approval & Tanda Tangan", tidak ada banner "Menunggu approval customer / Salin Link / Kirim Notifikasi", tidak ada tombol signature mekanik.
2. Klik "Selesaikan SPK" → tidak lagi meminta `approval_as_order` / `signature_mekanik`.
3. Print PDF tetap menampilkan signature admin & customer yang diinput saat SPK dibuat.

Boleh saya lanjutkan implementasi?
