# SPK — Cetak PDF Otomatis, Approval 3-Hop, Signature Digital

## Masalah Sekarang
1. **Cetak error**: `/spk/:id/print` mengandalkan `window.print()` browser. Di sebagian device (mobile/PWA) memunculkan error / halaman kosong, dan hasil bukan file PDF yang bisa diunduh.
2. **Approval terlalu panjang**: workflow saat ini punya 8 hop (draft → awaiting_customer_approval → approved → assigned → in_progress → work_completed → qc_pending → qc_passed → invoice_issued → invoice_paid → closed). Terlalu ribet untuk pemakaian harian.
3. **Signature tidak ada**: `SignaturePad` sudah ada di Canvas tapi tidak tersambung ke Runtime → tidak tersimpan → di PDF cetakan hanya garis kosong.

## Target Akhir
- Tombol **"Unduh PDF"** pada halaman SPK Print langsung menghasilkan file `SPK-<nomor>.pdf` (auto-download, tanpa dialog print browser).
- Isi PDF = **template Stroban Service Report** persis seperti kertas: header, Customer, Vehicle, Sales Advisor (order + oli + package), Mekanik/Diagnostic Check (engine, brake, tyres, AC, suspension), Notes, Waktu, tanda tangan digital, AI Health, dan Final Check.
- Semua kolom auto-terisi dari data hasil cek mekanik yang tersimpan di `spk_orders.data`.
- Workflow disederhanakan jadi **3 hop**: Admin → Customer → QC → (selesai). Sisanya diarsipkan / tidak ditampilkan.
- Signature Admin, Customer, dan Mekanik QC tersimpan sebagai gambar dan tampil di PDF.

## Perubahan

### 1. PDF Otomatis (client-side, tanpa error `window.print`)
- Tambah dependency `jspdf` + `html2canvas`.
- Ganti `SPKPrint.tsx` → render layout template ke `<div id="spk-doc">` (versi HTML mirroring paper form: 3 kolom header, blok Order, blok Diagnostic Check per kategori, Tyres grid, Waktu, Notes, Signature, AI Health, Final Check).
- Tombol "Unduh PDF" memanggil `html2canvas` (scale 2, useCORS) → `jsPDF("p","mm","a4")`, multi-page auto-split, `pdf.save("SPK-<nomor>.pdf")`.
- Tombol lama "Cetak" tetap ada sebagai opsi cadangan.
- Preview PDF halaman menggunakan A4 fixed width supaya konsisten desktop & mobile.

### 2. Signature Digital Tersambung Runtime
- Field baru pada `spk_form_fields` untuk template `spk_service_report`:
  `signature_admin`, `signature_customer`, `signature_qc` (type `signature`, section 11 Approval, non-required tapi divalidasi soft).
- Bungkus `SignaturePad` jadi `SignaturePadBound` yang pakai `useBinding` → simpan dataURL PNG ke runtime → auto-save ke `spk_orders.data`.
- Ganti 3 pad di `ApprovalCard.tsx` menjadi "Admin/Sales Advisor", "Customer", "Mekanik QC" (menggantikan "Technician / Sales Advisor / Customer").
- Di `SPKPrint`, render `<img src={d.signature_*}/>` bila ada, fallback garis kosong.

### 3. Approval Sederhana 3-Hop
- Update seed pada `spk_workflow_transitions` untuk `workflow_code = spk_default`:
  ```
  draft → awaiting_customer_approval        (admin, admin_cabang, owner)
  awaiting_customer_approval → qc_pending   (system/customer via approval action)
  qc_pending → closed                       (mechanic, admin, owner)
  * → cancelled                             (admin, owner)
  qc_pending → awaiting_customer_approval   (mechanic reject/rework)
  ```
  Semua hop lain (`approved`, `assigned`, `in_progress`, `work_completed`, `qc_passed`, `invoice_*`) dihapus dari workflow default supaya UI Canvas tidak menampilkannya lagi. Status enum tetap ada (backward compatible).
- `ACTION_META` di `useSPKWorkflow.ts` diperbarui:
  - `awaiting_customer_approval` → "Kirim ke Customer untuk Approval"
  - `qc_pending` → "Customer Menyetujui → Kirim ke QC"
  - `closed` → "QC Selesai — Tutup SPK"
- Default `spk.approval_matrix` di OCL: `{ manager_approval:false, qc_required:true, final_approval:true }`.
- Customer app (`CustomerSPKCard`) sudah punya action approval — pastikan tombolnya memicu transisi `awaiting_customer_approval → qc_pending` via `WorkflowEngine`.

### 4. Kebersihan UI
- Chip status di header Canvas map ke label baru (Draft, Menunggu Approval Customer, QC, Selesai, Batal).
- Section stepper (11 sections) tetap; hanya action bar yang berubah.

## Teknis Singkat
- File utama disentuh:
  - `src/pages/spk/SPKPrint.tsx` (rewrite → HTML template + jsPDF download).
  - `src/components/spk/canvas/ApprovalCard.tsx` + `SignaturePad.tsx` (bind ke runtime).
  - `src/hooks/spk/useSPKWorkflow.ts` (ACTION_META baru + `PRIMARY_STATUSES` allowlist untuk filter action).
  - `supabase migration`: rewrite seed `spk_workflow_transitions` (delete lama untuk `spk_default`, insert 5 hop baru), update `spk.role_profiles`/`approval_matrix` di `app_settings`.
- Tidak menambah edge function baru (PDF di client saja, cepat & gratis).
- Tidak mengubah `spk_orders` schema (signature disimpan di `data` JSONB).

## Validasi
- Buka `/spk/<id>/print` → klik "Unduh PDF" → file terunduh, buka & cek: header nomor SPK, data customer/vehicle, hasil cek engine/AC/tyres, catatan mekanik, 3 tanda tangan, AI Health.
- Dari Canvas admin: klik "Kirim ke Customer untuk Approval" → status `awaiting_customer_approval`. Dari akun customer di HP: approve → status `qc_pending`. Dari akun mekanik: klik "QC Selesai" → status `closed`.
- Regres: cetak untuk SPK yang belum ada signature → PDF tetap keluar dengan garis kosong.
