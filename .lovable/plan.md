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

---

## Phase 3.6 — Implementation Contract & Build Strategy (Design Only)

Referensi: Phase 2.6 LOCKED (§34–§40), Data Model (§41–§47), Core Engine (§48–§56), Dynamic Builder (§57–§68), Analytics & Event (§69–§78), UX Workflow (§79–§89). Dokumen ini murni kontrak implementasi — tidak ada migration, SQL, tabel, komponen, halaman, API, edge function, atau kode.

### §90. Build Order
Urutan implementasi (tidak boleh dilompat):
1. **Foundation** — enum, tipe dasar, tabel identitas (branch, user, role, vehicle master, customer master).
2. **SPK Core Table** — `spk`, `spk_status_history`, ownership, field lock.
3. **Event Store** — `spk_event` append-only + `EventBusService` (§70).
4. **Sinks** — Timeline projection, Audit sink, Notification sink, Realtime sink (§71).
5. **Dynamic Form Metadata** — `form_template`, `form_template_version`, `form_section`, `form_field`, `conditional_rule` (§58).
6. **Workflow Services** — `WorkflowService`, `StatusTransitionService`, `AssignmentService`, `ApprovalService` (§50).
7. **Line Items & Estimation** — LineItem, EstimationVersion, Snapshot (§50, §64).
8. **Invoice & Payment** — Invoice, Payment, Refund (§50).
9. **UX Shell** — role-based screen (Reception, Mechanic, QC, Cashier, Owner) sesuai §80.
10. **Analytics Projection** — KPI view + read models (§72–§73).
11. **AI Layer** — feature reader, recommendation, vehicle health (§75).

Setiap tahap wajib melewati Acceptance Criteria (§97) sebelum tahap berikutnya dimulai.

### §91. Dependency Matrix
- Foundation → semua modul.
- SPK Core → Event Store, Workflow, LineItem, Invoice, UX.
- Event Store → Sinks, Analytics, AI.
- Form Metadata → SPK Core (snapshot on create), UX renderer.
- Workflow → UX action bar, Notification.
- LineItem/Estimation → Invoice, Approval.
- Invoice → Payment → Close SPK.
- Sinks → Timeline, Audit, Notification, Realtime (read-only konsumen).
- Analytics → murni derivasi dari Event Store, tidak menulis ke Core.
- AI → membaca Event Store + Analytics view, tidak menulis ke Core.

Dependency berbentuk DAG (§53). Tidak boleh ada back-edge dari sink/analytics/AI ke Core.

### §92. Migration Strategy (Kategori, Bukan SQL)
Urutan kategori migration:
1. **Foundation Migration** — enum, tabel identitas, GRANT + RLS dasar.
2. **Master Data Migration** — vehicle, customer, service catalog, branch config.
3. **Workflow Migration** — SPK, status history, event store, form metadata.
4. **Analytics Migration** — projection tables / materialized views (derivasi dari event).
5. **Optimization Migration** — index, partition, retention policy.

Aturan: additive only, tidak boleh destructive terhadap data existing. Field deprecated ditandai, tidak dihapus. Setiap migration wajib punya rollback plan (§95).

### §93. Backward Compatibility
- Fitur existing (booking, invoice, katalog, customer, loyalty, tire, dsb.) tetap online selama build.
- Modul SPK berdiri di samping fitur existing sampai cutover.
- Tidak boleh mengubah kontrak tabel existing yang dipakai fitur produksi.
- Jika perlu penambahan kolom, hanya `ADD COLUMN` nullable + default.
- Enum lama tidak boleh dihapus selama masih dipakai.

### §94. Zero Downtime Strategy
- Deployment bertahap: backend (edge function, migration) rilis lebih dulu, frontend menyusul.
- Migration additive → rilis tanpa lock berkepanjangan.
- Feature flag per modul SPK (Reception, Mechanic, QC, Cashier, Owner).
- Toggle per cabang untuk pilot rollout (§98).
- Read model dibangun paralel; cutover switch di UI, bukan di DB.
- Operasional bengkel tidak berhenti — SPK kertas tetap valid selama transisi.

### §95. Rollback Strategy
- Setiap migration punya reverse plan (drop kolom baru, disable feature flag, revert projector).
- Event Store append-only → rollback = disable consumer, event tetap aman.
- Rollback UI = matikan feature flag, kembalikan role ke workflow lama.
- Rollback data = tidak menghapus event; hanya menandai `event_reverted` (§70).
- Kriteria rollback: gagal Acceptance Criteria produksi, insiden data, atau instruksi Owner.

### §96. Testing Strategy
- **Unit Test**: setiap Core Service (§50), Conditional evaluator (§61), Validator (§62), Projector (§71).
- **Integration Test**: command → event → sink → read model end-to-end.
- **UAT per role**: Reception, Mechanic, QC, Cashier, Owner mengikuti workflow §80.
- **Production Validation**: shadow run di pilot branch, compare KPI event-derived vs manual log.
- **Non-functional**: offline flow (§84), replay determinism (§73), performance target (§86).

### §97. Acceptance Criteria (per Modul)
- **Foundation**: RLS aktif di semua tabel, GRANT tepat, no anon leak.
- **SPK Core**: create → transition → close berjalan, semua transition tercatat sebagai event.
- **Event Store**: append-only terverifikasi, replay deterministik.
- **Dynamic Builder**: publish version → SPK baru pakai snapshot, SPK lama tidak berubah.
- **Workflow**: pre-condition enforced, tombol UI mengikuti engine.
- **Invoice/Payment**: total invoice = sum snapshot line item; status sinkron event.
- **UX Shell**: target §86 tercapai (≤ 60s intake, ≤ 3 tap aksi utama).
- **Analytics**: seluruh KPI §72 dapat dihitung tanpa query ke SPK core.
- **AI Layer**: feature reader membaca event stream, tidak menulis ke Core.

### §98. Release Strategy
1. **Internal Testing** — tim developer + Owner, semua feature flag on di staging.
2. **Pilot Branch** — 1 cabang, SPK Digital + SPK kertas berjalan paralel, 2–4 minggu.
3. **Multi Branch** — 2–3 cabang, evaluasi KPI event-derived vs baseline.
4. **Production Full Release** — semua cabang, SPK kertas menjadi fallback saja.
5. **Post-release** — monitoring event volume, error rate, waktu rata-rata SPK.

Setiap tahap punya go/no-go berdasarkan Acceptance Criteria.

### §99. Final Blueprint Validation
- Phase 2.6 LOCKED — konsisten. SSOT = SPK.
- Phase 3.1 Data Model — konsisten. Ownership Matrix jelas.
- Phase 3.2 Core Engine — konsisten. DAG, no back-edge.
- Phase 3.3 Dynamic Builder — konsisten. Metadata-driven, snapshot per SPK.
- Phase 3.4 Analytics & Event — konsisten. Append-only, deterministic replay.
- Phase 3.5 UX Workflow — konsisten. UI stateless, engine-driven.
- Phase 3.6 — kontrak implementasi, tidak menambah requirement baru.

Tidak ditemukan kontradiksi antar fase. Tidak ada duplicate SSOT, duplicate workflow, duplicate analytics, atau circular dependency.

### §100. Blueprint Lock Certificate

> **BLUEPRINT VERSION 1.0 — IMPLEMENTATION READY**
>
> - Scope: Phase 1, 1.5, 2, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6.
> - Status: LOCKED.
> - SSOT: SPK sebagai Living Document.
> - Arsitektur: Event-sourced core, metadata-driven form, DAG dependency, UI stateless.
> - Implementasi: hanya boleh dimulai atas perintah eksplisit user pada Phase 4.
>
> Setiap perubahan setelah titik ini harus melalui versi blueprint baru (v1.1+) dengan proses review yang sama.

**Output Phase 3.6**: dokumen desain saja. Tidak ada migration, SQL, table, komponen, halaman, API, edge function, atau kode. Phase 4 (implementasi Foundation) hanya dimulai atas perintah eksplisit user.
