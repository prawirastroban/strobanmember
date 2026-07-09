## Phase 3.5 — UX Workflow & Human Interaction Blueprint (Design Only)

Append sections **§79–§89** to `.lovable/plan.md`. No code, no migration, no UI, no SQL. Consistent with Phase 2.6 LOCKED, 3.1, 3.2, 3.3, 3.4.

### §79. Prinsip UX Inti
- Faster than paper: target ≤ 60 detik intake, ≤ 3 tap untuk aksi utama.
- One-hand operation, thumb-zone first, bottom action bar.
- Minimum typing → prefer tap/toggle/preset.
- Progressive disclosure: hanya field relevan yang muncul.
- Visual confirmation di setiap state transition (event dari §69–§71).
- Konsumen tetap stateless — UI hanya membaca SPK + Event.

### §80. Workflow Mapping per Role
Untuk setiap role: entry point, langkah, handoff, exit, status transition (mengacu §35 status enum + §52 lifecycle):
- **Reception**: Scan plat/QR → identifikasi customer → intake form → estimasi awal → `spk_created` → handoff Mechanic. Exit: `Awaiting Customer Approval`.
- **Mechanic**: Terima assignment → inspection checklist → foto sebelum → kerjakan → foto sesudah → `work_completed` → handoff QC.
- **QC**: Buka SPK → verifikasi checklist QC → pass/fail → `qc_passed` atau `qc_failed` (rework loop).
- **Cashier**: Terima SPK QC-passed → generate invoice → terima pembayaran → `invoice_paid` → close.
- **Owner**: Dashboard read-only + approval + override (audit-logged).

Setiap handoff = event pada EventBus (§70), bukan mutasi state di UI.

### §81. Human Interaction Blueprint
- Touch target ≥ 44×44 (mobile) / 48×48 (workshop tablet).
- Bottom action bar untuk aksi primer.
- Sticky header: SPK number + status pill + timeline dot.
- Konfirmasi destructive/irreversible via sheet, bukan alert kecil.
- Haptic + toast pada event sukses.
- Skeleton, bukan spinner, untuk perceived speed.

### §82. Smart Input Strategy
Prioritas input (paling ringan → paling berat):
1. Auto-fill (dari history vehicle/customer)
2. Scan (QR plat, barcode part, VIN)
3. Preset / Quick Action
4. Toggle / Checklist / Radio
5. Dropdown / Multi-select
6. Numeric stepper
7. Free-text (last resort)

Voice, OCR, barcode ditandai "future-ready" — Dynamic Builder (§60) sudah punya field type-nya, renderer tinggal aktifkan.

### §83. Progressive Form Strategy
- Field visibility driven by `ConditionalRule` (§61), bukan hardcode.
- Section collapsible + default collapsed untuk section opsional.
- "Show more" pattern untuk field jarang dipakai.
- Aturan: jangan tampilkan field yang tidak akan diisi 80% kasus.
- Form tetap sederhana walau template bertambah — beban ada di metadata, bukan layout.

### §84. Offline Workflow
- Offline: draft disimpan lokal (queue), tandai badge "Belum tersinkron".
- Reconnect: auto-flush queue → EventBus append (§70) dengan `occurred_at` original + `received_at` server.
- Conflict: append-only → tidak ada overwrite; jika ada duplikasi command → dedupe via `correlation_id`.
- Retry: exponential backoff.
- Sync indicator: per-SPK dot (synced / pending / error).
- Tidak ada operasi yang menghapus event lokal sebelum ACK server.

### §85. Error Prevention
- Field required dienforce di 3 lapis (§62): client, engine, DB.
- Tombol status transition disabled sampai pre-condition terpenuhi (dari `WorkflowService` §50).
- Konfirmasi ganda untuk: close SPK, cancel, refund, override.
- Lock indicator pada field yang sudah di-snapshot (§64).
- Empty state, error state, loading state didefinisikan untuk setiap layar.

### §86. Productivity Metrics (UX Target)
- Intake SPK baru: ≤ 60 detik, ≤ 3 free-text input.
- Mechanic update status: ≤ 2 tap.
- QC pass: ≤ 3 tap.
- Cashier close: ≤ 4 tap (tanpa metode pembayaran custom).
- Scroll per screen: ≤ 2 layar.
- Time-to-first-action pada halaman: < 1 detik (skeleton).
KPI ini dihitung dari event log (§72–§73), bukan instrumentasi terpisah.

### §87. Accessibility Guideline
- High-contrast mode (workshop lighting).
- "Workshop Mode": font besar, kontras tinggi, tap target diperbesar.
- Status = warna + ikon + teks (tidak hanya warna).
- Semua ikon-only button punya aria-label.
- `h-dvh` untuk full-height mobile.
- Fokus indikator visible di semua interactive element.
- Bahasa default Indonesia; siap i18n via `EventTypeRegistry` label (§71).

### §88. Future Compatibility
Workflow tetap valid untuk: Android native, tablet workshop, desktop kasir, web owner, AI Assistant (baca event stream §75), Voice input (field type sudah ada di §60), OCR intake plat, Barcode/QR scan part & SPK. Tidak ada asumsi platform di workflow.

### §89. Final Validation & Conclusion
- Tidak bertentangan dengan §34–§40 (LOCKED), §41–§47 (Data Model), §48–§56 (Core Engine), §57–§68 (Dynamic Builder), §69–§78 (Analytics/Event).
- UI tetap stateless, membaca SPK + Event.
- Semua status transition melalui engine, bukan tombol lokal.
- Progressive form murni metadata-driven.
- Offline behavior append-only, konsisten dengan event sourcing.
- Metrics diambil dari event, tidak duplicate SSOT.

**Output**: dokumen desain saja. Tidak ada migration, SQL, table, komponen, halaman, API, edge function. Phase 3.6 (implementasi UX shell) hanya dimulai atas perintah eksplisit user.

### File yang diubah
- `.lovable/plan.md` — append §79–§89.

Konfirmasi untuk menulis dokumen ini?

---

## Phase 3.5 — UX Workflow & Human Interaction Blueprint (Design Only)

Referensi: Phase 2.6 LOCKED (§34–§40), Data Model (§41–§47), Core Engine (§48–§56), Dynamic Builder (§57–§68), Analytics & Event (§69–§78). Dokumen ini murni desain — tidak ada migration, SQL, tabel, komponen, halaman, API, atau edge function.

### §79. Prinsip UX Inti
- Faster than paper: target ≤ 60 detik intake, ≤ 3 tap untuk aksi utama.
- One-hand operation, thumb-zone first, bottom action bar.
- Minimum typing → prefer tap/toggle/preset.
- Progressive disclosure: hanya field relevan yang muncul.
- Visual confirmation di setiap state transition (event dari §69–§71).
- Konsumen tetap stateless — UI hanya membaca SPK + Event, tidak menyimpan state bisnis.

### §80. Workflow Mapping per Role
Setiap handoff = event pada EventBus (§70), bukan mutasi state di UI. Status transition mengacu §35 + lifecycle §52.
- **Reception**: Scan plat/QR → identifikasi customer → intake form → estimasi awal → `spk_created` → `estimation_version_published`. Exit: `Awaiting Customer Approval`.
- **Mechanic**: Terima assignment (`assignment_accepted`) → inspection checklist → foto sebelum → `work_started` → kerjakan → foto sesudah → `work_completed` → handoff QC.
- **QC**: Buka SPK QC-ready → checklist QC → `qc_passed` atau `qc_failed` (rework loop kembali ke Mechanic).
- **Cashier**: Terima SPK QC-passed → generate invoice (`invoice_issued`) → terima pembayaran (`payment_received`) → `invoice_paid` → `spk_closed`.
- **Owner**: Dashboard read-only + approval + override (semua override audit-logged via `ownership_transferred` / `event_corrected`).

### §81. Human Interaction Blueprint
- Touch target ≥ 44×44 (mobile) / 48×48 (workshop tablet).
- Bottom action bar untuk aksi primer role saat itu.
- Sticky header: SPK number + status pill + timeline dot.
- Konfirmasi destructive/irreversible via sheet, bukan alert kecil.
- Haptic + toast pada event sukses.
- Skeleton, bukan spinner, untuk perceived speed.
- Empty/error/loading state didefinisikan untuk setiap layar.

### §82. Smart Input Strategy
Prioritas input (paling ringan → paling berat):
1. Auto-fill dari history vehicle/customer
2. Scan (QR plat, barcode part, VIN)
3. Preset / Quick Action
4. Toggle / Checklist / Radio
5. Dropdown / Multi-select
6. Numeric stepper
7. Free-text (last resort)

Voice, OCR, barcode/QR ditandai "future-ready" — field type sudah ada di §60, renderer tinggal aktifkan tanpa perubahan metadata schema.

### §83. Progressive Form Strategy
- Field visibility murni driven by `ConditionalRule` (§61), bukan hardcode UI.
- Section collapsible + default collapsed untuk section opsional.
- "Show more" pattern untuk field jarang dipakai.
- Aturan editorial: jangan tampilkan field yang tidak akan diisi 80% kasus.
- Form tetap sederhana walau template bertambah — beban ada di metadata, bukan layout.

### §84. Offline Workflow
- Offline: draft disimpan lokal (queue), badge "Belum tersinkron".
- Reconnect: auto-flush queue → EventBus append (§70) dengan `occurred_at` original + `received_at` server.
- Conflict: append-only → tidak ada overwrite; dedupe via `correlation_id`.
- Retry: exponential backoff.
- Sync indicator per-SPK: synced / pending / error.
- Tidak ada operasi yang menghapus event lokal sebelum ACK server.

### §85. Error Prevention
- Field required dienforce di 3 lapis (§62): client renderer, engine, DB.
- Tombol status transition disabled sampai pre-condition `WorkflowService` (§50) terpenuhi.
- Konfirmasi ganda untuk: close SPK, cancel, refund, override.
- Lock indicator pada field yang sudah di-snapshot (§64).
- Tidak boleh ada "save partial" yang meng-close SPK dalam kondisi tidak lengkap.

### §86. Productivity Metrics (UX Target)
- Intake SPK baru: ≤ 60 detik, ≤ 3 free-text input.
- Mechanic update status: ≤ 2 tap.
- QC pass: ≤ 3 tap.
- Cashier close: ≤ 4 tap (metode pembayaran default).
- Scroll per screen: ≤ 2 layar.
- Time-to-first-action per halaman: < 1 detik (skeleton).

KPI dihitung dari event log (§72–§73), bukan instrumentasi terpisah — no duplicate SSOT.

### §87. Accessibility Guideline
- High-contrast mode (workshop lighting).
- "Workshop Mode": font besar, kontras tinggi, tap target diperbesar.
- Status = warna + ikon + teks (tidak hanya warna).
- Semua icon-only button wajib `aria-label`.
- `h-dvh` untuk full-height mobile.
- Fokus indikator visible di semua interactive element.
- Bahasa default Indonesia; siap i18n via `EventTypeRegistry` label (§71).

### §88. Future Compatibility
Workflow tetap valid untuk: Android native, tablet workshop, desktop kasir, web owner, AI Assistant (baca event stream §75), Voice input (field type §60), OCR intake plat, Barcode/QR scan part & SPK, Mobile Mechanic, Offline Sync. Tidak ada asumsi platform di workflow.

### §89. Final Validation & Conclusion
- Tidak bertentangan dengan §34–§40 (LOCKED), §41–§47 (Data Model), §48–§56 (Core Engine), §57–§68 (Dynamic Builder), §69–§78 (Analytics/Event).
- UI stateless, membaca SPK + Event.
- Semua status transition via engine, bukan tombol lokal.
- Progressive form murni metadata-driven.
- Offline behavior append-only, konsisten dengan event sourcing.
- Metrics diambil dari event, tidak menghasilkan SSOT baru.

**Output**: dokumen desain saja. Tidak ada migration, SQL, table, komponen, halaman, API, edge function. Phase 3.6 (implementasi UX shell) hanya dimulai atas perintah eksplisit user.
