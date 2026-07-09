# Phase 1 — SPK Digital Specification (FINAL) + Phase 1.5 Validation

> **Status:** ✅ Phase 1.5 VALIDATED (locked). Phase 1 FINAL tetap berlaku.
> **Scope:** Dokumen spesifikasi. Tidak ada kode, migrasi DB, atau UI baru pada Phase 1.
> **Catatan:** 4 pertanyaan terbuka pada draft sebelumnya sudah dijawab lewat "Final Decision" user dan dinormalisasi ke dalam dokumen ini.

---

## 1. Prinsip Arsitektur (locked)

- **SPK adalah pusat sistem servis**, bukan Booking.
- Booking hanyalah salah satu **origin** yang bermuara ke workflow SPK yang sama.
- Origin yang didukung (nilai `origin_type` di SPK):
  1. `online_booking` — customer booking via web/app
  2. `walk_in` — customer datang langsung tanpa booking
  3. `fleet` / `corporate` — B2B / armada
  4. `emergency` — servis darurat / on-site
  5. `internal` — kendaraan operasional bengkel sendiri
- Semua origin masuk ke **workflow SPK yang identik**. Tidak ada workflow paralel.
- Booking (jika ada) di-**freeze** setelah SPK dibuat. Setelah SPK exists, semua field operasional (status, progress, invoice, history) dibaca dari SPK, bukan booking.

## 2. Penomoran SPK

- Format wajib: `SPK-YYYY-NNNNNN`
- Contoh: `SPK-2026-000001`
- **Wajib** di-generate otomatis oleh sistem. Tidak boleh input manual.
- Sequence per tahun kalender, zero-padded 6 digit.
- Nomor unik global; collision protection via DB sequence + unique constraint (implementasi di Phase 2).

## 3. Workflow Utama (canonical, invariant)

```text
Customer Datang
      │
      ▼
  SPK dibuat            ← Reception
      │
      ▼
 Advisor Inspection     ← Service Advisor
      │
      ▼
 Mechanic Process       ← Mechanic
      │
      ▼
       QC               ← QC
      │
      ▼
    Invoice             ← Kasir
      │
      ▼
 History Kendaraan      ← sistem (auto-append)
      │
      ▼
    Analytics           ← sistem (auto)
```

**Aturan:** Urutan 7 tahap ini adalah **invariant**. Yang boleh dikonfigurasi adalah **isi form / checklist / field** di dalam tiap tahap, bukan urutan atau eksistensi tahapnya.

## 4. Matriks Role & Kewenangan

| Role | Kewenangan Utama | Boleh | Tidak Boleh |
|---|---|---|---|
| **Reception** | Membuat SPK | Input data awal customer, kendaraan, origin | Ubah hasil inspeksi/QC/invoice |
| **Service Advisor** | Inspeksi & scoping | Isi hasil inspeksi, tentukan pekerjaan, estimasi | Kerjakan mekanik / closing invoice |
| **Mechanic** | Eksekusi pekerjaan | Isi checklist, upload foto, tambah catatan teknis | **Ubah data administrasi**, harga, invoice, atau approve QC-nya sendiri |
| **QC** | Approval hasil | Approve / reject hasil pekerjaan mekanik | Ubah invoice / harga |
| **Kasir** | Closing & Invoice | Terima pembayaran, generate invoice final | Ubah hasil inspeksi/QC |
| **Owner / Super Admin** | Akses penuh | Semua di atas + konfigurasi SPK Builder + laporan | — |

**Catatan mapping role existing:** Enum DB saat ini adalah `staff` (Owner), `admin` (CS), `admin_cabang`, `customer`. Pemetaan role SPK (Reception, Advisor, Mechanic, QC, Kasir) ke enum existing **belum diputuskan di Phase 1** — didaftarkan sebagai *pending decision* untuk Phase 2 (kemungkinan: perluasan enum atau tabel `user_roles` multi-role per user).

## 5. SPK Configurable (SPK Builder)

Isi form SPK **tidak boleh hardcode**. Owner dapat mengubah form tanpa coding melalui SPK Builder.

**Tipe field yang didukung:**

- `text`
- `number`
- `date`
- `checkbox`
- `dropdown`
- `signature`
- `photo`
- `section` (grouping)
- `heading` (label saja)

**Atribut wajib per field:**

| Atribut | Tipe | Keterangan |
|---|---|---|
| `label` | string | Nama yang tampil ke user |
| `required` | boolean | Wajib diisi atau tidak |
| `visibility` | enum | Kapan field tampil (`always`, `conditional`, `hidden`) |
| `order` | integer | Urutan tampil di form |
| `target_role` | enum | Role yang mengisi field (Reception / Advisor / Mechanic / QC / Kasir) |

Konfigurasi form disimpan di tabel konfigurasi terpisah (implementasi Phase 2). Perubahan form **tidak boleh** memengaruhi workflow 7 tahap.

## 6. Vehicle History = Turunan SPK

- **Sumber tunggal** histori kendaraan adalah SPK final (bukan booking).
- Setiap SPK yang mencapai status `closed` / `invoiced` akan meng-append entri ke history kendaraan.
- Fondasi ini menopang fitur jangka panjang:
  - **Vehicle Health Timeline** — kronologi kondisi kendaraan dari SPK ke SPK.
  - **Analisis kondisi kendaraan** — prediksi servis berikutnya, wear pattern, anomali biaya.
  - **Rekomendasi otomatis** berbasis histori SPK per VIN / plat.

## 7. Kompatibilitas dengan Modul Existing

| Modul Existing | Perlakuan di era SPK |
|---|---|
| `bookings` + wizard | Tetap sebagai *intent layer*. Freeze setelah SPK dibuat. |
| `LiveProgressTracker` / `ServiceProgress` | Berlangganan event SPK (bukan booking) begitu SPK exists. |
| `PaymentDialog` / `ManualPayment` / Midtrans functions | Dipicu dari tahap **Invoice** SPK. |
| `InvoiceView` (`INV-000001`) | 1 SPK ≤ 1 invoice. Bridge idempotent by `spk_id`. |
| `HistoryPerawatan` / `VehicleDetail` | Sumber data digeser dari booking → SPK. |
| Reports Hub / `analytics-insights` / `ga4-analytics` | Tambah kategori "SPK Ops" (SLA per tahap, throughput mekanik, QC reject rate). |
| `dispatch-notification` | Dispatcher generik existing dipakai untuk event SPK dengan dedup key `(entity_type, entity_id, event)`. |

Tidak ada modul yang di-*replace*. Semua modul di atas hanya berpindah **source of truth** ke SPK.

## 8. Risiko yang Tetap Berlaku

- **Dobel source of truth** (booking vs SPK). Mitigasi: booking di-freeze setelah SPK exists; semua read operasional dari SPK.
- **Pricing drift** antara scoping dan invoice. Mitigasi: SPK menyimpan **line snapshot** (qty, price, discount), bukan referensi harga live.
- **Vehicle snapshot**. Field yang dicetak di invoice harus di-snapshot di SPK, bukan foreign key hidup ke `vehicles`.
- **Approval async** (customer lambat balas). Butuh SLA + reminder + fallback approval offline oleh staff.
- **QC bottleneck**. Role QC harus bisa di-*delegate* (bukan hanya 1 orang) — diserahkan ke matriks role Phase 2.
- **Walk-in identity**. Walk-in bisa tanpa akun → buat *lightweight customer record* dengan tag `acquisition_source='walk_in'`.
- **Race condition** transisi paralel (mis. QC approve vs Kasir cancel). Mitigasi: versioning / optimistic lock pada SPK.
- **Refund / partial payment** pasca invoice — harus dicerminkan balik ke status SPK (`refunded`, `partial`).

## 9. Penutup

- **Phase 1 CLOSED.** Seluruh keputusan di atas menjadi spesifikasi resmi proyek SPK Digital.
- **Phase 2 belum boleh dimulai** sampai user memberi perintah eksplisit.
- Tidak ada implementasi kode, migrasi DB, edge function, atau UI yang boleh dikerjakan berdasarkan dokumen ini sampai Phase 2 di-*kick-off*.

---

# Phase 1.5 — Final Architecture Validation (Analysis Only)

> **Status:** ✅ VALIDATED (locked). Tidak ada implementasi. Menambah kontrak arsitektural yang wajib dikunci sebelum Phase 2.

## 10. Lifecycle Status SPK (canonical)

Enum wajib `spk_status`:

`draft` → `open` → `inspection` → `awaiting_customer_approval` → `approved` → `in_progress` → `qc` → (`qc_rejected` ↺ `in_progress`) → `ready_for_invoice` → `invoiced` → `closed`

State paralel (boleh terjadi kapan saja dari state aktif):

- `on_hold` — pause sementara (menunggu part, customer, dsb). Kembali ke state sebelumnya.
- `cancelled` — SPK dibatalkan. Terminal.
- `refunded` / `partial_refund` — status turunan pasca `invoiced` bila ada refund.

**Matrix transisi legal (ringkas):**

| Dari | Ke yang diizinkan |
|---|---|
| `draft` | `open`, `cancelled` |
| `open` | `inspection`, `on_hold`, `cancelled` |
| `inspection` | `awaiting_customer_approval`, `on_hold`, `cancelled` |
| `awaiting_customer_approval` | `approved`, `cancelled`, `on_hold` |
| `approved` | `in_progress`, `on_hold`, `cancelled` |
| `in_progress` | `qc`, `on_hold`, `cancelled` |
| `qc` | `ready_for_invoice`, `qc_rejected` |
| `qc_rejected` | `in_progress` (increment `qc_iteration`) |
| `ready_for_invoice` | `invoiced`, `cancelled` |
| `invoiced` | `closed`, `refunded`, `partial_refund` |
| `closed` | (terminal) |

**Wajib:** transisi harus dijaga oleh state machine di layer server, bukan `if/else` UI. Field wajib: `qc_iteration` (int, default 0).

## 11. Timeline Event vs Audit Log (pemisahan tegas)

Dua konsep berbeda, dua tabel logis berbeda:

| Aspek | `spk_timeline_events` | `spk_audit_log` |
|---|---|---|
| Tujuan | Cerita user-facing per tahap | Forensik & kepatuhan internal |
| Konsumen | Customer view, dashboard progress | Owner/Super Admin, compliance |
| Granularitas | Stage-level (transisi status) | Field-level (diff before/after) |
| Konten wajib | `spk_id`, `from_status`, `to_status`, `actor_id`, `actor_role`, `note`, `at` | `spk_id`, `actor_id`, `actor_role`, `action`, `before` (jsonb), `after` (jsonb), `ip`, `user_agent`, `at` |
| Visibility | Bisa dipublish ke customer | Internal only |

**Larangan:** Jangan gabungkan dua tabel ini. Jangan pakai `admin_audit_log` global untuk SPK — SPK punya audit log sendiri agar retensi & policy bisa berbeda.

## 12. Kontrak Operasional

### 12.1 Save Draft

- `spk.status='draft'` untuk SPK baru yang belum di-submit.
- Autosave per section, interval ≤ 15 detik saat ada perubahan.
- Setiap value form menyimpan `is_draft` (bool) dan `last_saved_at`.
- Konflik resolution: optimistic lock via `version` (int, increment tiap simpan). Jika `version` server ≠ client → tolak, minta reload.
- Draft tidak boleh muncul di dashboard operasional (hanya di "My Drafts" pemilik).

### 12.2 SLA per tahap (config, bukan hardcode)

Target awal (menit) — disimpan di tabel config `spk_sla_config`:

| Stage | `target_minutes` | `warn_at` (%) | `breach_at` (%) |
|---|---:|---:|---:|
| Reception (create SPK) | 10 | 70 | 100 |
| Advisor Inspection | 30 | 70 | 100 |
| Awaiting Customer Approval | 120 | 50 | 100 |
| Mechanic Process | dinamis per job | 80 | 120 |
| QC | 20 | 70 | 100 |
| Kasir / Invoice | 15 | 70 | 100 |

Nilai bisa di-override per cabang.

### 12.3 Attachment

Tabel logis `spk_attachments`:

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | uuid | PK |
| `spk_id` | uuid | FK |
| `stage` | enum | Reception/Advisor/Mechanic/QC/Kasir |
| `kind` | enum | `photo`, `video`, `document`, `voice` |
| `uploader_id` | uuid | actor |
| `mime` | text | |
| `size_bytes` | bigint | |
| `storage_path` | text | bucket + path |
| `created_at` | timestamptz | |

**Policy default:** photo ≤ 10 MB, video ≤ 100 MB, voice ≤ 20 MB, document ≤ 25 MB. Retensi minimal 24 bulan untuk foto/dokumen; video/voice 6 bulan kecuali di-flag.

### 12.4 Customer Approval Estimasi

- Stage `awaiting_customer_approval` wajib sebelum `in_progress`.
- Kanal notifikasi: in-app + WhatsApp (via `dispatch-notification` existing).
- Timeout default 120 menit (config). Setelah timeout → escalation ke Advisor.
- Bukti approval yang valid (salah satu): OTP WhatsApp, tap "Setuju" pada in-app dengan session valid, tanda tangan digital di device Advisor (fallback offline), foto persetujuan tertulis.
- Fallback offline **wajib** dicatat: siapa Advisor yang meng-override, alasan, bukti attachment.

### 12.5 Vehicle Health Score — signal wajib

Setiap SPK yang mencapai `closed` wajib menghasilkan record dengan minimum field:

- `mileage_in`, `mileage_out` (km)
- `defects[]` — array terstruktur `{code, description, severity ∈ [low, medium, high, critical]}`
- `qc_findings` (text/jsonb ringkas)
- `recommended_next_service` (kategori + tanggal target)
- `days_since_last_spk` (auto-computed)

Field-field ini wajib "required" di form config default. SPK Builder boleh menambah field, tapi **tidak boleh menghilangkan** signal minimum ini.

## 13. Analytics Data Contract

Dimensi minimum yang wajib tersedia untuk dashboard analyst (di-*derive* dari SPK, bukan tabel terpisah manual):

| Dimensi | Sumber | Contoh metrik |
|---|---|---|
| `origin_type` | SPK | Throughput per origin |
| `stage` + `stage_duration` | timeline events | Bottleneck stage, SLA breach rate |
| `assignee_id` per stage | SPK | Throughput per mekanik, QC reject per mekanik |
| `qc_result`, `qc_iteration` | SPK | QC reject rate, rework rate |
| `vehicle_id` + `days_since_last_spk` | history | Repeat service rate, retention |
| `service_category` | SPK line items | Revenue mix |
| `revenue`, `discount`, `payment_method` | invoice | Revenue per origin, discount leakage |
| `defect severity` | health score | Fleet health, wear pattern |

**Aturan:** semua metrik harus bisa di-*derive* dari data SPK + turunan tanpa event tracking terpisah.

## 14. Phase 1.5 Sign-off Checklist (WAJIB sebelum Phase 2)

- [x] Enum final `spk_status` + matrix transisi legal (§10).
- [x] Pemisahan `spk_timeline_events` vs `spk_audit_log` (§11).
- [x] Kontrak Save Draft — `is_draft`, `last_saved_at`, `version` lock (§12.1).
- [x] Tabel SLA config, bukan konstanta (§12.2).
- [x] Skema `spk_attachments` generik + policy retensi/size (§12.3).
- [x] Kontrak customer approval + fallback offline + bukti (§12.4).
- [x] Signal wajib Vehicle Health Score (§12.5).
- [x] Dimensi wajib untuk dashboard analyst (§13).
- [ ] **Pending Phase 2 kick-off:** Mapping role SPK (Reception/Advisor/Mechanic/QC/Kasir) ke enum DB existing (`staff`/`admin`/`admin_cabang`). Harus diputuskan di awal Phase 2 sebelum migrasi apa pun.

## 15. Invariant Re-affirmed

- SPK adalah **single source of truth**.
- Booking hanya **origin**.
- Workflow 7 tahap **tidak berubah**.
- Form dikonfigurasi via **SPK Builder** (tanpa hardcode).
- Phase 1.5 = analisis. **Tidak ada** perubahan DB, edge function, atau UI.
- Phase 2 **belum boleh dimulai** sampai user memberi perintah eksplisit.

---

# Phase 2 — SPK Foundation Blueprint (Analysis Only)

> **Status:** ✅ Phase 2 Blueprint (analysis only) — locked.
> **Scope:** Konseptual. Tidak ada migrasi DB, tabel, edge function, React component, halaman, form, routing, atau perubahan permission existing.

## 16. Entity Map (konseptual, bukan DDL)

| Entity | Peran | Relasi utama |
|---|---|---|
| **SPK** | Single source of truth workflow servis | 1:1 Booking (opsional), N:1 Customer, N:1 Vehicle, N:1 Branch, 0..N assignment Advisor/Mechanic/QC/Kasir, 1:0..1 Invoice, 1:N Timeline, 1:N Audit, 1:N Attachment, 1:N Approval |
| **Customer** | Pemilik kendaraan / requester | 1:N Vehicle, 1:N SPK, 1:N Approval |
| **Vehicle** | Kendaraan yang diservis | N:1 Customer, 1:N SPK, 1:N HealthScore snapshot |
| **Booking** | Origin (intent layer) | 1:0..1 SPK. Freeze setelah SPK dibuat. |
| **Branch** | Lokasi eksekusi servis | 1:N SPK, 1:N Staff |
| **Advisor / Mechanic / QC / Kasir / Reception** | Role assignment pada SPK | N:M SPK via assignment per stage |
| **Invoice** | Dokumen tagihan final | 1:1 SPK (idempotent by `spk_id`) |
| **Timeline** | Kronologi user-facing stage transitions | N:1 SPK |
| **Audit** | Forensik field-level | N:1 SPK |
| **Attachment** | Media (foto/video/dokumen/voice) | N:1 SPK, per stage |
| **Approval** | Persetujuan customer atas estimasi | N:1 SPK, N:1 Customer |
| **HealthScore Snapshot** | Turunan SPK closed → history kendaraan | N:1 Vehicle, 1:1 SPK |

Relasi ringkas:

```text
Customer 1─┬─N Vehicle 1─┬─N SPK 1─┬─0..1 Invoice
           │             │         ├─N Timeline
           │             │         ├─N Audit
           │             │         ├─N Attachment
           │             │         ├─N Approval
           │             │         └─1 HealthScoreSnapshot
Branch  1──┴─N SPK        Booking 0..1 → SPK (origin)
Roles (Reception/Advisor/Mechanic/QC/Kasir) N─M SPK per stage
```

Aturan kunci:
- Booking → SPK adalah **one-way freeze**.
- Invoice unik per SPK (`unique(spk_id)`).
- Vehicle & Customer di-**snapshot** ke SPK saat dibuat (bukan FK live untuk field yang dicetak di invoice).

## 17. Workflow (canonical lifecycle)

Menegaskan Section 3 + Section 10. Lifecycle final SPK:

```text
Draft
  ↓
Reception (Open)
  ↓
Advisor Inspection
  ↓
Awaiting Customer Approval
  ↓
Approved
  ↓
Mechanic (In Progress) ──┐
  ↓                       │
QC                        │
  ├─ QC Rejected ─────────┘  (increment qc_iteration)
  ↓
Ready for Invoice
  ↓
Invoiced (Kasir)
  ↓
Completed → Closed
```

State paralel (dapat aktif kapan saja pada state aktif):
- `On Hold` — pause; kembali ke state sebelumnya.
- `Cancelled` — terminal.
- `Refunded` / `Partial Refund` — turunan pasca `Invoiced`.

**Terminal (final, tidak ambigu):** `Closed`, `Cancelled`.
**Semi-terminal:** `Refunded`, `Partial Refund` (mengikuti Closed).
Semua state lain adalah **transient**.

## 18. Timeline Events (kronologis, user-facing)

Katalog event bisnis yang wajib tercatat di `spk_timeline_events` (konsep, bukan tabel):

| Event | Trigger | Actor | Visible ke customer |
|---|---|---|---|
| `spk.created` | SPK dibuat dari origin | Reception / System | ✅ |
| `reception.completed` | Reception submit data awal | Reception | ✅ |
| `advisor.started` | Advisor buka SPK & mulai inspeksi | Advisor | ✅ |
| `advisor.finished` | Advisor submit hasil inspeksi + estimasi | Advisor | ✅ |
| `approval.requested` | Estimasi dikirim ke customer | System | ✅ |
| `approval.approved` | Customer setuju | Customer / Advisor (offline) | ✅ |
| `approval.rejected` | Customer tolak | Customer | ✅ |
| `mechanic.started` | Mekanik mulai kerja | Mechanic | ✅ |
| `mechanic.finished` | Mekanik selesai | Mechanic | ✅ |
| `qc.started` | QC mulai review | QC | ✅ |
| `qc.approved` | QC pass | QC | ✅ |
| `qc.rejected` | QC gagal, kembali ke Mechanic | QC | ✅ |
| `invoice.generated` | Invoice dibuat | Kasir / System | ✅ |
| `payment.completed` | Pembayaran lunas | Kasir / System | ✅ |
| `spk.closed` | SPK di-close | System | ✅ |
| `spk.cancelled` | SPK dibatalkan | Any authorized | ✅ |
| `spk.on_hold` / `spk.resumed` | Pause / lanjut | Advisor / Owner | ✅ |
| `spk.refunded` / `spk.partial_refund` | Refund | Kasir / Owner | ✅ |

Payload minimum tiap event: `spk_id`, `event`, `actor_id`, `actor_role`, `from_status`, `to_status`, `note`, `at`.

## 19. Audit Log (internal, terpisah dari Timeline)

Berbeda tujuan dari Timeline. Audit **field-level**, tidak untuk customer.

Format record audit (konseptual):

| Field | Isi |
|---|---|
| `spk_id` | referensi SPK |
| `actor_id` | siapa |
| `actor_role` | role saat perubahan |
| `at` | kapan (timestamptz) |
| `action` | `create` / `update` / `delete` / `override` |
| `field_path` | jalur field yang berubah (mis. `advisor.estimation.total`) |
| `old_value` | nilai lama |
| `new_value` | nilai baru |
| `ip`, `user_agent` | konteks teknis |
| `reason` | opsional untuk override |

Aturan:
- **Tidak** ditampilkan di UI customer.
- Retensi minimal 24 bulan.
- Semua override fallback (offline approval, force close, edit invoice) **wajib** menghasilkan record audit dengan `reason`.

## 20. Permission Matrix (konseptual, tidak mengubah permission existing)

Legenda: ✅ boleh · ⚠️ dengan syarat · ❌ tidak boleh

| Role | View SPK | Edit SPK | Approve | Reject | Delete | Close SPK | Refund | Edit Invoice | SPK Builder |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Owner** | ✅ semua cabang | ✅ | ✅ | ✅ | ⚠️ soft-delete + audit | ✅ | ✅ | ✅ | ✅ |
| **Super Admin** | ✅ semua cabang | ✅ | ✅ | ✅ | ⚠️ soft-delete + audit | ✅ | ⚠️ perlu Owner approve | ⚠️ | ❌ |
| **Admin Cabang** | ✅ cabang sendiri | ⚠️ non-finansial | ⚠️ approval offline saja | ⚠️ | ❌ | ⚠️ cabang sendiri | ❌ | ❌ | ❌ |
| **Reception** | ✅ cabang sendiri | ⚠️ hanya data awal & origin | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Service Advisor** | ✅ SPK yang di-assign | ⚠️ field inspeksi & estimasi | ⚠️ offline approval (dengan bukti) | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mechanic** | ✅ SPK yang di-assign | ⚠️ checklist, foto, catatan teknis | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **QC** | ✅ SPK di-stage QC | ⚠️ hasil QC saja | ✅ (QC approve) | ✅ (QC reject) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Kasir** | ✅ SPK di-stage Invoice+ | ⚠️ field pembayaran | ❌ | ❌ | ❌ | ⚠️ setelah lunas | ⚠️ input refund → butuh approval | ⚠️ pre-finalize | ❌ |
| **Customer** | ✅ SPK sendiri (view terbatas) | ❌ | ✅ terhadap estimasi | ✅ terhadap estimasi | ❌ | ❌ | ❌ | ❌ | ❌ |

Catatan:
- Mekanik **tidak boleh** menyentuh field administratif/harga (kunci dari Section 4).
- Delete = **soft-delete** saja, wajib audit + alasan. Hard-delete hanya via prosedur data retention Owner-approved.
- Matrix ini adalah **kontrak konseptual**. Mapping ke enum DB existing (`staff` / `admin` / `admin_cabang` / `customer`) tetap **pending Phase 2 kick-off implementasi** (item terakhir Section 14).

---

## 21. Penutup Phase 2 Blueprint

- Phase 2 Blueprint **CLOSED** sebagai kontrak konseptual.
- **Tidak ada** migrasi DB, tabel, edge function, komponen, halaman, form, routing, atau perubahan permission yang dibuat berdasarkan Phase 2 ini.
- Phase 3 (implementasi) baru boleh dimulai setelah user memberi perintah eksplisit.

---

# Phase 2.5 — SPK Operational Validation (Analysis Only)

> **Status:** ✅ Phase 2.5 VALIDATED (analysis only, locked).
> **Scope:** Validasi menyeluruh terhadap Phase 1 + 1.5 + 2. Tidak ada migrasi, DB, UI, component, edge function, API, routing, atau permission change.

## 22. Validasi Customer Journey

| # | Journey | Status | Gap / catatan |
|---|---|:---:|---|
| 1 | Booking Online | ✅ | `origin_type='online_booking'`, freeze booking setelah SPK. |
| 2 | Walk-in Customer | ✅ | `origin_type='walk_in'` + lightweight customer record `acquisition_source='walk_in'` (§8). |
| 3 | Customer Baru | ⚠️ | On-the-spot registration belum eksplisit. Rekomendasi: flow "quick customer" (nama + WA), lengkapi via link WA. |
| 4 | Customer Lama | ✅ | Snapshot Vehicle/Customer dipisah dari FK live. |
| 5 | Fleet / Corporate | ⚠️ | Butuh entity **Company** (payer ≠ vehicle owner: PIC, PO, term). |
| 6 | Emergency Service | ⚠️ | Butuh `location_type='on_site'`, koordinat, penugasan Mobile Mechanic (lihat §27). |

## 23. Validasi Workflow SPK (20 skenario)

| # | Skenario | Status | Catatan |
|---|---|:---:|---|
| 1 | Ban saja | ✅ | Line item `tire`. |
| 2 | Service saja | ✅ | Line `service`. |
| 3 | Ban + Service | ✅ | Multi-line, 1 SPK. |
| 4 | Spooring / Balancing | ✅ | Line `alignment`. |
| 5 | Ganti oli | ✅ | Line `oil_change`. |
| 6 | Multi layanan | ✅ | Multi-line. |
| 7 | Tambah pekerjaan saat dibongkar | ⚠️ | Butuh konsep **AWO** (Additional Work Order) + re-approval. |
| 8 | Customer menolak tambahan | ⚠️ | State `additional_rejected` pada AWO. |
| 9 | Approve sebagian pekerjaan | ⚠️ | Butuh approval **per-line**. |
| 10 | Estimasi biaya berubah | ⚠️ | **Estimate versioning** + threshold re-approval. |
| 11 | Mekanik diganti | ⚠️ | **Assignment history**, event `mechanic.reassigned`. |
| 12 | Advisor diganti | ⚠️ | Event `advisor.reassigned`. |
| 13 | QC gagal | ✅ | `qc_rejected → in_progress`, `qc_iteration++`. |
| 14 | QC lolos | ✅ | `qc → ready_for_invoice`. |
| 15 | SPK dibatalkan | ✅ | `cancelled` terminal + alasan wajib + partial billing. |
| 16 | SPK diulang | ⚠️ | Konsep `parent_spk_id`. |
| 17 | SPK warranty | ⚠️ | `is_warranty` + `warranty_parent_spk_id` + policy billing. |
| 18 | SPK revisi (reopen dalam warranty) | ⚠️ | State `reopened`. |
| 19 | Selesai belum dibayar | ⚠️ | State derivatif `invoiced_unpaid` (aging). |
| 20 | Selesai sudah dibayar | ✅ | `payment.completed → closed`. |

**Kesimpulan §23:** 8 lolos, 12 butuh penajaman (AWO, per-line approval, estimate versioning, assignment history, parent chain, warranty, reopen, aging).

## 24. Validasi Timeline — event yang harus ditambahkan

| Event | Alasan |
|---|---|
| `additional_work.requested/approved/rejected` | Skenario 7–8 |
| `estimate.revised` (+ `delta_amount`) | Skenario 10 |
| `advisor.reassigned` / `mechanic.reassigned` | Skenario 11–12 |
| `spk.reopened` | Skenario 18 |
| `warranty.claimed` | Skenario 17 |
| `invoice.unpaid_reminder_sent` | Skenario 19 |
| `attachment.added` / `attachment.removed` | Chain of custody |
| `sla.breached` (per stage) | Analitik SLA §12.2 |
| `line.approved` / `line.rejected` | Skenario 9 |

Aturan: setiap aksi bisnis yang mengubah **cost, scope, ownership, atau state** wajib menghasilkan timeline event.

## 25. Validasi Audit — gap

1. **Cakupan wajib:** semua field di `spk`, `spk_line_items`, `spk_estimation`, `spk_approval`, `invoice`, `assignment` = wajib audit. Field draft form (checklist) = opsional bila volume besar.
2. **Chain of custody attachment:** upload/delete → audit dengan **hash file**, bukan hanya path.
3. **Bulk operations:** 1 record audit per SPK, bukan record gabungan.
4. **Retention finansial:** 60 bulan untuk field finansial, 24 bulan lainnya (override §19).
5. **Immutability:** audit tidak boleh UPDATE/DELETE oleh siapa pun kecuali proses retention terjadwal.

## 26. Validasi Permission (privilege escalation & konflik)

| Risiko | Status | Mitigasi kontrak |
|---|:---:|---|
| Mekanik ubah harga/invoice | ✅ | Matrix §20 sudah ❌. |
| Advisor approve pekerjaan sendiri di QC | ⚠️ | **SoD:** QC ≠ Advisor SPK yang sama. |
| QC = Mechanic pada SPK yang sama | ⚠️ | **SoD:** dilarang self-QC. |
| Kasir ubah invoice pasca-payment | ⚠️ | **Invoice immutable** pasca `payment.completed`; perubahan via refund/adjust + approval. |
| Admin Cabang lihat SPK cabang lain | ✅ | Scope cabang; enforce **server-side** (bukan UI filter). |
| Customer lihat SPK orang lain | ✅ | Filter server-side by `auth.uid()`. |
| Offline approval jadi loophole | ⚠️ | Wajib bukti (signature/foto/OTP) + audit override reason (hard req). |
| Owner "god mode invisible" | ⚠️ | Owner tetap terkena audit log. |
| Reassignment sebagai backdoor | ⚠️ | Reassign butuh actor ≥ Admin Cabang + audit. **No self-assign** ke SPK yang bukan milik. |
| Delete SPK | ✅ | Soft-delete + audit + alasan. Hard-delete Owner-only via retention. |

7 aturan tambahan yang wajib dikunci: SoD QC≠Advisor, SoD QC≠Mechanic (SPK sama), invoice immutable pasca payment, server-side scoping, offline-approval bukti hard-req, Owner tetap ter-audit, no self-assign, delete governance.

## 27. Future Scalability Review

| Kebutuhan | Kompatibilitas | Yang perlu disiapkan (konseptual) |
|---|:---:|---|
| Multi Branch | ✅ | `branch_id` sudah wajib. |
| Multi Company | ⚠️ | Konsep `company_id` opsional di SPK/Branch — hindari breaking migration. |
| Franchise | ⚠️ | Pisahkan `owner_company_id` vs `operator_company_id`. |
| Marketplace Booking | ✅ | `origin_type='marketplace'` + `marketplace_partner_id`. |
| Mobile Mechanic | ⚠️ | `service_mode ∈ {in_shop, on_site, pickup_delivery}` + koordinat. |
| IoT Inspection | ✅ | Attachment generik cukup; rekomendasi `kind='iot_reading'`. |
| AI Recommendation | ✅ | Signal Health Score §12.5 memadai. |
| Predictive Maintenance | ✅ | Vehicle Health Timeline + defects[] + severity. |
| Data Warehouse | ⚠️ | CDC-friendly: `created_at`/`updated_at` wajib; **no in-place update tanpa audit**. |

Konsep yang wajib **future-proof** sekarang: `company_id`, `franchise_id`, `service_mode`, `iot_reading`, prinsip CDC.

## 28. Ringkasan Validasi

**Lolos tanpa perubahan:** origin online/walk-in, kategori dasar (ban/oli/service/spooring), QC pass/fail, cancel terminal, payment→closed, audit minimum, soft-delete, matrix role terhadap escalation fatal, kompatibilitas multi-branch/marketplace/AI/predictive/IoT.

**Butuh penajaman blueprint (konseptual, no code):**

1. Entity **Company** (multi-tenant/fleet payer)
2. **Additional Work Order (AWO)** + re-approval
3. Approval **per-line**
4. **Estimate versioning** + threshold re-approval
5. **Assignment history**
6. `parent_spk_id` & `warranty_parent_spk_id`
7. State `reopened`, derivatif `invoiced_unpaid`
8. 9 timeline events tambahan (§24)
9. 7 aturan permission tambahan (§26)
10. Retensi audit finansial 60 bulan + immutability
11. Field future: `company_id`, `franchise_id`, `service_mode`, `iot_reading`

**Risiko desain (harus diselesaikan sebelum Phase 3):**
- R1: AWO tidak ditangani → mekanik mulai tanpa approval → dispute.
- R2: Tanpa estimate versioning → customer klaim harga naik diam-diam.
- R3: Assignment overwrite → hilang jejak siapa mengerjakan.
- R4: QC = Mechanic pada SPK sama → self-approval fraud.
- R5: Invoice mutable pasca payment → fraud finansial.
- R6: Warranty tanpa link parent → sulit hitung cost of quality.
- R7: Retensi audit finansial < 5 tahun → risiko audit eksternal.

## 29. Penutup Phase 2.5

- Phase 2.5 **CLOSED** sebagai laporan validasi konseptual.
- Tidak ada migrasi, DB, UI, component, edge function, API, routing, atau permission change.
- Phase 3 (Database Foundation) baru boleh dimulai setelah user memberi perintah eksplisit **dan** 11 penajaman di §28 disetujui sebagai bagian tak terpisahkan dari blueprint.

---

# PRE PHASE 3.1 — SPK Living Document Validation (Analysis Only)

Referensi: Phase 1, 1.5, 2, 2.5. Dokumen ini **tidak** membuat implementasi, migration, SQL, tabel, atau UI. Tujuan: memastikan SPK diperlakukan sebagai **Living Document** dan **Single Source of Truth (SSOT)** sebelum masuk Phase 3.1 (Data Model Foundation).

## 30. Prinsip Living Document — Checklist Validasi

| # | Prinsip | Status | Bukti / Lokasi Blueprint |
|---|---------|--------|--------------------------|
| 1 | SPK dibuat **satu kali** (no re-create per stage) | ✅ Lolos | §16 Entity Map — SPK 1:1 Booking, Booking freeze setelah SPK dibuat; workflow §17 hanya mengubah `status`, tidak membuat record baru. |
| 2 | SPK **berkembang** sepanjang workflow tanpa record baru | ✅ Lolos | §17 canonical lifecycle 11 state — semua transisi in-place pada baris SPK yang sama; child records (line_items, approvals, assignments, timeline, audit) hanya **melekat** ke SPK. |
| 3 | Setiap role hanya melihat **field sesuai tanggung jawab** | ✅ Lolos | §20 Permission Matrix per-role; §26 aturan tambahan (mechanic tidak akses admin/finansial fields, customer view terbatas). |
| 4 | Field dapat berubah **berdasarkan tahap workflow** | ✅ Lolos | §17 status-driven; §20 & §26 mengunci editability per state (contoh: invoice fields immutable pasca payment, estimation locked pasca customer approval kecuali via revision). |
| 5 | SPK Builder hanya mengatur **field & layout**, bukan workflow | ✅ Lolos | §16 & §20 memisahkan "SPK Builder" (form config) dari lifecycle §17 (fixed 7-stage). Workflow tidak dapat diubah lewat Builder. |
| 6 | Invoice = **snapshot SPK** | ✅ Lolos | §16 Entity Map — Vehicle & Customer disnapshot ke SPK; Invoice 1:0..1 SPK; §26 R5 invoice immutable pasca payment memastikan snapshot integrity. |
| 7 | Vehicle History berasal dari SPK | ✅ Lolos | Phase 1.5 §11 (Vehicle Health Score berbasis histori SPK); §23 `parent_spk_id` mengikat re-SPK ke SPK induk. |
| 8 | Analytics berasal dari SPK | ✅ Lolos | Phase 1.5 & §27 — semua metrik operasional/finansial di-derive dari SPK + Timeline + Audit; tidak ada sumber paralel. |
| 9 | Dashboard berasal dari SPK | ✅ Lolos | §17 status = sumber tunggal untuk semua kartu dashboard (WIP, QC queue, awaiting approval, ready-to-invoice, dsb.). |
| 10 | AI Recommendation masa depan pakai histori SPK | ✅ Lolos | §27 scalability — AI/Predictive/IoT semua compatible dengan SPK sebagai SSOT (via `iot_reading` attachment + histori SPK per vehicle). |

**Skor prinsip Living Document: 10/10 lolos secara konseptual.**

## 31. Audit Duplikasi (Duplicate Source Check)

| Kategori | Potensi Duplikasi | Verdict | Catatan |
|----------|-------------------|---------|---------|
| **Duplicate SSOT** | Booking vs SPK | ✅ Aman | §16 menetapkan Booking = **origin only**, freeze setelah SPK dibuat. Semua mutasi setelah itu di SPK. |
| **Duplicate SSOT** | Invoice sebagai sumber finansial paralel | ✅ Aman | Invoice = snapshot (§16, §26 R5). Bukan sumber independen. |
| **Duplicate data** | Vehicle/Customer di SPK vs master | ✅ Aman by design | Snapshot ke SPK adalah **desain sadar** untuk immutability histori — bukan duplikasi liar. Master tetap SSOT untuk data profil, SPK memegang snapshot momen servis. |
| **Duplicate data** | Estimation vs Line Items vs Invoice lines | ⚠️ Perlu ditegaskan | §23 sudah menyebut estimate versioning, namun blueprint belum eksplisit menyatakan **line_items = SSOT tunggal**, dan estimation/invoice hanya **view/snapshot** darinya. Lihat rekomendasi R-A. |
| **Duplicate workflow** | SPK status vs Booking status vs Invoice status | ⚠️ Perlu ditegaskan | Booking status harus **freeze** begitu SPK terbentuk (turunan dari SPK). Invoice status = derivatif SPK (`invoiced`, `invoiced_unpaid`, `refunded`). Belum eksplisit dilarang di blueprint. Lihat R-B. |
| **Duplicate workflow** | Approval customer vs QC approval | ✅ Aman | §17 & §20 memisahkan tegas: customer approval = pra-kerja, QC approval = pasca-kerja. |
| **Duplicate history** | Timeline vs Audit Log | ✅ Aman | §18 (Timeline = user-facing events) vs §19 (Audit Log = field-level internal). Sudah dipisah eksplisit. |
| **Duplicate history** | Vehicle History vs SPK list per vehicle | ⚠️ Perlu ditegaskan | Vehicle History **wajib** = query turunan (view) atas SPK, bukan tabel terpisah yang di-write. Lihat R-C. |
| **Duplicate analytics** | Dashboard KPI vs Reports Hub vs CRM Analytics | ⚠️ Perlu ditegaskan | Semua widget analitik harus derive dari SPK + Timeline + Audit. Tidak boleh ada tabel `analytics_snapshot` yang di-write manual di luar CDC/materialized view. Lihat R-D. |
| **Duplicate analytics** | Vehicle Health Score storage | ⚠️ Perlu ditegaskan | Skor harus **computed** (view/materialized view) dari histori SPK, bukan field yang di-update manual. Lihat R-E. |

## 32. Rekomendasi Penajaman Blueprint Phase 2 (Tanpa Implementasi)

Tambahkan lima klausul berikut ke Phase 2 (§16 Entity Map & §17 Workflow) sebelum Phase 3.1 dimulai:

- **R-A. Line Items sebagai SSOT pekerjaan & harga.**
  - `spk_line_items` adalah satu-satunya sumber pekerjaan dan harga.
  - `estimation` = snapshot terversi dari line_items pada saat customer approval.
  - `invoice_lines` = snapshot terkunci dari line_items pada saat `invoice.generated`.
  - Tidak boleh ada tabel harga paralel yang bisa di-edit independen.

- **R-B. Status Derivation Rule.**
  - `booking.status` **freeze** ke `converted_to_spk` setelah SPK dibuat; tidak boleh diubah oleh proses lain.
  - `invoice.status` adalah **derivatif** dari `spk.status` + `payment` (bukan state independen).
  - Hanya `spk.status` yang boleh di-mutate oleh transisi workflow.

- **R-C. Vehicle History = View atas SPK.**
  - Vehicle History **bukan tabel write-target**. Ia adalah query/view (`select ... from spk where vehicle_id = ...`).
  - Larangan menulis "vehicle_history_entry" secara manual di luar konteks SPK.

- **R-D. Analytics Derivation Rule.**
  - Semua metrik dashboard / Reports Hub / CRM Analytics harus di-derive dari SPK + `spk_timeline` + `spk_audit_log` (boleh via view / materialized view / CDC pipeline).
  - Dilarang menulis metrik ke tabel operasional secara manual dari UI.

- **R-E. Vehicle Health Score = Computed.**
  - Health Score adalah **computed value** dari histori SPK per vehicle.
  - Boleh disimpan sebagai cache (materialized view / kolom `_computed_at`), tapi tidak boleh di-edit manual.

## 33. Kesimpulan Pre-Phase 3.1

- Prinsip Living Document: **10/10 lolos** secara konseptual.
- Ditemukan **5 area yang perlu ditegaskan** (R-A s/d R-E) agar tidak muncul duplikasi SSOT/data/workflow/history/analytics pada implementasi.
- Rekomendasi: **kunci R-A s/d R-E sebagai addendum Phase 2 (§16/§17)** sebelum Phase 3.1 dimulai.
- Setelah addendum disetujui user, blueprint dinyatakan **siap masuk Phase 3.1 (SPK Data Model Foundation)**.
- Pre-Phase 3.1 ini **CLOSED sebagai laporan analitis** — tidak ada migration, SQL, tabel, edge function, UI, komponen, API, routing, atau permission change yang dibuat.

---

# PHASE 2.6 — Blueprint Lock (Architecture Finalization)

Referensi: Phase 1, 1.5, 2, 2.5, dan Pre-Phase 3.1 (§30–33). Dokumen ini **tidak** membuat implementasi, migration, SQL, tabel, UI, edge function, atau trigger. Tujuan tunggal: **mengunci** blueprint sebelum Phase 3.1.

## 34. Addendum R-A — Single Source of Truth (SSOT)

Diadopsi sebagai bagian resmi blueprint (memperkuat §16 & §33 R-A):

- **SPK** = satu-satunya sumber data operasional. Semua mutasi status, pekerjaan, harga, assignment, approval, dan hasil QC terjadi di SPK.
- **Booking** = **origin only**. Setelah SPK terbentuk, Booking di-freeze (`converted_to_spk`) dan tidak boleh dimutasi oleh modul lain.
- **Invoice** = **output**, snapshot terkunci dari SPK line_items pada `invoice.generated`. Bukan sumber operasional.
- **Vehicle History** = **turunan** (view) atas SPK per `vehicle_id`. Bukan tabel write-target.
- **Dashboard** = **pembaca** SPK + Timeline + Audit. Tidak memiliki state sendiri.
- **Analytics / Reports / CRM** = **pembaca** SPK + Timeline + Audit (boleh via view / materialized view / CDC). Tidak menulis metrik operasional secara manual.
- **Larangan mutlak:** tidak boleh ada modul lain (booking, invoice, vehicle history, analytics, dashboard, CRM, AI) yang menjadi sumber kebenaran paralel.

## 35. Addendum R-B — Snapshot Principle

- Semua data historis dalam SPK **wajib** menggunakan snapshot:
  - `customer_snapshot`, `vehicle_snapshot`, `branch_snapshot`, `pricing_snapshot`, `estimation_snapshot`, `invoice_snapshot`.
- Perubahan master data (Customer / Vehicle / Branch / Service Catalog / Price List) **tidak boleh** mengubah SPK historis maupun invoice lama.
- Master data adalah SSOT untuk **profil terkini**; SPK adalah SSOT untuk **momen servis**.
- Konsekuensi: revisi harga/data pelanggan pasca SPK hanya boleh melalui **estimate revision** (§23) atau **refund/partial refund** (§17), keduanya tercatat sebagai event baru — bukan mutasi retroaktif.

## 36. Addendum R-C — Workflow Ownership & Handoff

Setiap field pada SPK memiliki **satu role owner** pada satu waktu. Owner berpindah mengikuti transisi status (§17). Handoff terjadi via transisi status, bukan via edit paralel.

| Kelompok Field | Owner Aktif | Fase | Setelah Handoff |
|----------------|-------------|------|-----------------|
| Booking origin, customer intent | Reception | Draft → Open | Read-only bagi semua role |
| Vehicle intake, inspection notes, initial complaints | Reception → Service Advisor | Open → Inspection | Read-only setelah Inspection selesai |
| Estimation, line_items (draft), estimate version | Service Advisor | Inspection → Awaiting Customer Approval | Locked setelah customer approve; revisi = versi baru |
| Customer approval decision | Customer | Awaiting Customer Approval | Immutable |
| Assignment mekanik, work log, actual parts/labor | Service Advisor (assign) + Mechanic (execute) | Approved → In Progress | Locked setelah `mechanic.finished` |
| QC result, defect notes | QC (bukan mekanik/advisor yang sama) | QC | Immutable setelah `qc.approved` |
| Invoice fields, tax, discount final | Kasir / Service Advisor | Ready for Invoice → Invoiced | Immutable setelah `payment.completed` (§26 R5) |
| Payment, refund, partial refund | Kasir (+ Owner untuk refund) | Invoiced → Completed / Refunded | Immutable, hanya event baru |
| SPK close, cancel, reopen | Admin Cabang / Owner | Terminal transitions | Requires reason + audit |

**Aturan handoff:**
1. Owner lama kehilangan write-access begitu status berpindah.
2. Semua handoff otomatis menghasilkan event Timeline (§18) dan Audit entry (§19).
3. Reassignment (advisor/mechanic) **tidak menghapus** owner sebelumnya — tercatat sebagai `*.reassigned` event (§24).
4. Konflik kepemilikan (dua role mengedit field sama) **dilarang di level desain** — enforcement wajib server-side (§26).

## 37. Addendum R-D — Event Driven Principle

Lifecycle SPK diperlakukan sebagai **rangkaian event immutable**. Timeline, Notification, Analytics, Audit, KPI, dan AI di fase berikutnya semua dibangun di atas stream event yang sama.

**Event utama (superset dari §18 + §24):**

- Lifecycle: `spk.created`, `spk.status_changed`, `spk.closed`, `spk.cancelled`, `spk.reopened`, `spk.on_hold`, `spk.resumed`.
- Reception & Advisor: `reception.checked_in`, `advisor.started`, `advisor.finished`, `advisor.reassigned`.
- Estimation & Approval: `estimation.created`, `estimation.revised`, `line.added`, `line.approved`, `line.rejected`, `approval.requested`, `approval.approved`, `approval.rejected`, `additional_work.requested`, `additional_work.approved`, `additional_work.rejected`.
- Execution: `mechanic.assigned`, `mechanic.reassigned`, `mechanic.started`, `mechanic.paused`, `mechanic.resumed`, `mechanic.finished`.
- Quality: `qc.started`, `qc.approved`, `qc.rejected`, `qc.reworked`.
- Financial: `invoice.generated`, `invoice.sent`, `invoice.unpaid_reminder`, `payment.received`, `payment.completed`, `refund.requested`, `refund.approved`, `partial_refund.approved`.
- Warranty & Re-SPK: `warranty.claimed`, `spk.forked_child` (parent_spk_id link, tanpa clone).
- SLA / System: `sla.breached`, `sla.warning`, `iot.reading_received` (future), `ai.recommendation_generated` (future).

**Prinsip:**
- Event **append-only**, tidak pernah di-update in place.
- Setiap event membawa payload minimum: `spk_id`, `event`, `actor_id`, `actor_role`, `from_status`, `to_status`, `at`, `payload_json`, `reason?`.
- Timeline (§18), Notification (Phase 1.5), Analytics (§27), Audit (§19), KPI dashboard, dan AI (§27) **semua adalah konsumen** dari stream event ini — bukan sumber independen.
- Implementasi konkret stream event dirancang di Phase 3.1+; di Phase 2.6 hanya konsep yang dikunci.

## 38. Addendum R-E — Living Document Rule

Dikunci sebagai prinsip inti blueprint:

1. **SPK dibuat satu kali** — tidak ada re-create per stage.
2. **SPK tidak pernah di-clone** — re-SPK / warranty selalu berupa SPK baru dengan `parent_spk_id`, bukan salinan.
3. **SPK tidak pernah dipecah** — multi-service pada satu kunjungan tetap satu SPK, banyak `line_items`.
4. **SPK hanya berkembang mengikuti workflow** — mutasi terjadi in-place pada baris SPK yang sama, plus append pada child (line_items, timeline, audit, approval, assignment).
5. **Seluruh modul membaca SPK yang sama** — Dashboard, Invoice, Vehicle History, Analytics, CRM, AI semua konsumen SPK identik. Tidak ada varian per modul.

## 39. Konsistensi Akhir & Deteksi Kontradiksi

Review menyeluruh Phase 1 → Pre-Phase 3.1:

- §16 Entity Map ↔ §34 SSOT: **konsisten** — Booking origin, SPK operasional, Invoice output, Vehicle/Customer snapshot.
- §17 Workflow ↔ §36 Ownership: **konsisten** — setiap state punya owner tunggal; handoff via status change.
- §18 Timeline + §19 Audit ↔ §37 Event Driven: **konsisten** — keduanya konsumen event stream; tidak duplikasi.
- §20 & §26 Permission ↔ §36 Ownership: **konsisten** — SoD (QC≠Mechanic), invoice immutable pasca payment, no self-assign.
- §22–§28 Operational Validation ↔ §34–§38: **konsisten** — 11 penajaman §28 seluruhnya diserap oleh addendum R-A…R-E.
- §30–§33 Living Document Validation ↔ §34–§38: **konsisten** — 5 rekomendasi R-A…R-E Pre-Phase 3.1 diangkat menjadi addendum resmi Phase 2.6.
- **Tidak ditemukan kontradiksi.** Tidak ada duplicate SSOT, duplicate workflow, duplicate history, atau duplicate analytics dalam blueprint akhir.

## 40. Blueprint Lock Declaration

- Seluruh addendum R-A (SSOT), R-B (Snapshot), R-C (Ownership), R-D (Event Driven), dan R-E (Living Document) telah **terintegrasi resmi** ke dalam blueprint (§34–§38).
- Tidak ada kontradiksi antar fase (§39).
- **BLUEPRINT LOCKED.** Perubahan lebih lanjut hanya boleh dilakukan melalui addendum baru yang bernomor dan disetujui user secara eksplisit.
- Blueprint dinyatakan **SIAP MASUK PHASE 3.1 — SPK Data Model Foundation** setelah user memberi perintah eksplisit.
- Phase 2.6 CLOSED. Tidak ada migration, SQL, tabel, UI, edge function, trigger, komponen, API, routing, atau permission change yang dibuat pada fase ini.

---

# PHASE 3.1 — SPK Data Model Foundation (Design Only)

Referensi tunggal: blueprint LOCKED (Phase 1 → Phase 2.6). Tidak ada migration SQL, tabel, UI, edge function, trigger, realtime, notification, API, atau kode yang dibuat di fase ini. Output = **desain teknis** saja.

## 41. Entity Relationship Diagram (ERD)

Diagram lengkap disimpan sebagai artifact Mermaid: `SPK_ERD.mmd`. Ringkasan relasi utama:

- `branch (1) — (N) spk`
- `customer (1) — (N) vehicle`, `customer (1) — (N) booking`, `customer (1) — (N) spk` (snapshot)
- `vehicle (1) — (N) booking`, `vehicle (1) — (N) spk` (snapshot)
- `booking (1) — (1) spk` (origin, freeze)
- `spk (1) — (N) spk_line_item | assignment | approval | estimation_version | timeline_event | audit_log | attachment | signature | iot_reading`
- `spk (1) — (0..1) spk_invoice`, `spk_invoice (1) — (N) invoice_line | payment`
- `spk_payment (1) — (N) refund`
- `spk (1) — (N) spk` self-ref (`parent_spk_id` untuk warranty / re-SPK, **link only, bukan clone**)
- `service_catalog / part_catalog (1) — (N) spk_line_item` (reference, snapshot harga di line_item)
- `user_profile / user_role — spk_assignment | timeline_event | audit_log` (actor)
- `spk_form_template (1) — (N) spk_form_field`, `spk_form_template (1) — (N) spk` (Builder-driven layout, tidak mengubah workflow)
- `vehicle (1) — (N) vehicle_health_snapshot` (computed view/materialized dari SPK)

## 42. Data Dictionary

Format: **Nama** — tujuan · tanggung jawab · relasi · lifecycle · SSOT/turunan.

### Core operational

- **spk** — SSOT operasional (§34). Menyimpan header SPK: nomor, cabang, status, snapshot customer/vehicle/branch, referensi booking, `parent_spk_id`, `is_warranty`, `service_mode`, `template_id`, `opened_at`, `closed_at`. **Lifecycle:** dibuat sekali saat Booking → SPK, berkembang mengikuti §17, terminal di `Closed` / `Cancelled`. **SSOT.**
- **spk_line_item** — SSOT pekerjaan & harga (§32 R-A). Referensi ke service_catalog/part_catalog + `qty`, `unit_price_snapshot`, `discount`, `status_per_line`, `is_awo`, `assigned_mechanic_id`. **Lifecycle:** append/edit selama estimation, locked pasca customer approval kecuali via `estimation_revision`. **SSOT.**
- **spk_estimation_version** — Snapshot terversi dari line_items pada tiap revisi estimasi. `version_no`, `total`, `reason`, `created_by`, `approved_by_customer_at`. **Lifecycle:** append-only. **Turunan** dari line_items pada momen versi.
- **spk_approval** — Catatan approval customer (estimasi awal, revisi, additional work). `type`, `channel` (in_person/digital/offline), `signature_ref`, `decided_by`, `decided_at`, `note`. **Append-only.** **SSOT approval decision.**
- **spk_assignment** — Sejarah penugasan Advisor / Mechanic / QC per SPK. `role`, `user_id`, `assigned_at`, `unassigned_at`, `reason`. **Append-only** (reassignment = row baru, bukan update). **SSOT assignment history.**
- **spk_timeline_event** — Konsumen event stream user-facing (§37). Append-only, immutable. **Turunan** (derived dari lifecycle events).
- **spk_audit_log** — Field-level change log internal (§19). Append-only, immutable, retensi finansial 60 bulan. **Turunan.**
- **spk_attachment** — Foto, dokumen, hasil inspeksi, media QC. `kind`, `storage_path`, `hash`, `uploaded_by`. **Append-only.** **SSOT media.**
- **spk_signature** — Tanda tangan digital customer / QC / advisor (SVG/PNG hash). `role`, `signer_name`, `signed_at`, `hash`, `ip`. **Append-only.** **SSOT digital signature.**
- **spk_iot_reading** *(future-ready)* — Pembacaan IoT (tekanan ban, OBD, torque). `kind`, `value`, `unit`, `at`. Append-only. **SSOT IoT.**

### Financial (output layer)

- **spk_invoice** — Output SPK (§34). Snapshot header finansial: `invoice_no`, `total`, `tax`, `discount`, `issued_at`, `paid_at`, `status`. **Immutable pasca `payment.completed`** (§26 R5). **Turunan/output.**
- **spk_invoice_line** — Snapshot line_items pada momen `invoice.generated`. **Immutable.** **Turunan.**
- **spk_payment** — Catatan pembayaran (cash / transfer / midtrans / QRIS). Append-only. **SSOT payment.**
- **spk_refund** — Refund penuh / parsial atas payment. Append-only, event baru. **SSOT refund.**

### Reference / master (bukan SSOT SPK)

- **branch** — Master cabang. SSOT profil cabang; SPK memegang snapshot momen servis.
- **customer** — Master pelanggan. SSOT profil terkini; SPK memegang snapshot.
- **vehicle** — Master kendaraan. SSOT profil kendaraan; SPK memegang snapshot.
- **service_catalog / part_catalog** — Master layanan/part & harga. SSOT katalog; harga saat SPK di-snapshot ke line_item (§35).
- **user_profile / user_role** — Actor directory (RBAC). SSOT identitas & role.

### Configuration

- **spk_form_template** — Konfigurasi form/layout SPK Builder (§16). Mengatur **field visibility + layout per role/stage**, tidak mengatur workflow (§17 fixed). **SSOT template.**
- **spk_form_field** — Definisi field dalam template: `key`, `label`, `type`, `role_visibility[]`, `stage_visibility[]`, `owner_role`, `required_at_stage`. **SSOT field config.**

### Derived / computed

- **vehicle_health_snapshot** — Skor kesehatan kendaraan **computed** dari histori SPK per vehicle (§33 R-E). Boleh disimpan sebagai cache materialized view + `computed_at`. **Turunan, tidak boleh di-edit manual.**
- **vehicle_history** *(view, bukan tabel write-target)* — Query atas SPK per `vehicle_id`. **Turunan (§33 R-C).**
- **analytics_view_* / kpi_view_*** *(views/materialized views)* — Semua metrik dashboard/reports/CRM = view atas SPK + Timeline + Audit. **Turunan (§33 R-D).**

## 43. Ownership Matrix (Field / Entity → Role Owner)

Owner = write-owner aktif pada stage tersebut. Handoff otomatis pada transisi status (§36).

| Entity / Field group | Reception | Service Advisor | Mechanic | QC | Kasir | Admin Cabang / Owner |
|---|---|---|---|---|---|---|
| `spk` header (create, cabang, template) | ✍️ create | R | R | R | R | ✍️ close/cancel/reopen |
| `customer_snapshot` / `vehicle_snapshot` | ✍️ intake | R | R | R | R | R |
| Inspection notes, complaints | ✍️ | ✍️ finalize | R | R | R | R |
| `spk_line_item` (draft, price) | R | ✍️ | R | R | R (view) | R |
| `spk_estimation_version` | R | ✍️ append | R | R | R | R |
| `spk_approval` (customer) | R | request | R | R | R | R (decision by Customer) |
| `spk_assignment` (advisor/mechanic/QC) | R | ✍️ assign | R | R | R | ✍️ override |
| Work log, actual time, `is_awo` result | R | R | ✍️ | R | R | R |
| `spk_attachment` (inspection/work photos) | ✍️ intake | ✍️ | ✍️ | ✍️ QC media | R | R |
| `spk_signature` (customer/QC) | R | capture (customer) | R | ✍️ (QC) | R | R |
| QC result, defect notes | R | R | R | ✍️ | R | R |
| `spk_invoice` header, tax, final discount | R | assist | R | R | ✍️ | R (approve override) |
| `spk_invoice_line` (snapshot lock) | R | R | R | R | ✍️ generate | R |
| `spk_payment` | R | R | R | R | ✍️ | R |
| `spk_refund` / partial refund | R | R | R | R | request | ✍️ approve |
| `spk_timeline_event` / `spk_audit_log` | auto | auto | auto | auto | auto | R (read all) |
| `spk_form_template` / `spk_form_field` | R | R | R | R | R | ✍️ (Owner/Super Admin only) |
| `vehicle_health_snapshot` | R | R | R | R | R | R (computed only) |

Legend: ✍️ = write owner pada stage aktif, R = read-only, auto = system-generated.

Aturan tegas:
- QC ≠ Mechanic pada SPK yang sama (§26 SoD).
- Customer approval decision hanya milik Customer; role internal hanya mencatat.
- Owner selalu ter-audit meski memiliki hak override (§26).

## 44. Scalability Review

| Skenario | Verdict | Alasan |
|---|---|---|
| Multi cabang | ✅ | `branch_id` + `branch_snapshot` di SPK; index `(branch_id, status, opened_at)`. Sharding logis per branch mudah. |
| Multi mekanik per SPK | ✅ | `spk_assignment` many-rows + `spk_line_item.assigned_mechanic_id` mendukung mekanik per-line. |
| Multi advisor / reassignment | ✅ | Append-only assignment history + `advisor.reassigned` event (§37). |
| Fleet | ✅ | `customer.is_fleet` + optional `fleet_id`; agregasi via view `vehicle_health_snapshot` per fleet. |
| Corporate / multi-company | ✅ | Slot `company_id` disiapkan (§27); tidak mengubah SPK shape. |
| Franchise / multi-tenant | ✅ | Slot `franchise_id` disiapkan (§27); RLS scoping standard. |
| On-site / mobile service | ✅ | `service_mode ∈ {in_shop, on_site, mobile}` + `geo_point` di attachment/iot_reading. |
| AI Recommendation | ✅ | Konsumen event stream (§37) + histori SPK + `vehicle_health_snapshot`. Tidak memerlukan perubahan model. |
| Predictive maintenance | ✅ | Basis = histori SPK + iot_reading + health snapshot. |
| Data warehouse / BI | ✅ | Event stream append-only = CDC-ready; view lapisan analytics. |
| Volume (proyeksi 5 tahun) | ⚠️ mitigasi standar | Partisi `spk_timeline_event` / `spk_audit_log` by `at` (month/quarter). Cold storage untuk `attachment`. Materialized view refresh terjadwal untuk KPI. |

## 45. Future Compatibility Checklist

| Fitur masa depan | Kompatibel tanpa perubahan besar? | Basis |
|---|---|---|
| Vehicle Health | ✅ | `vehicle_health_snapshot` computed dari SPK |
| AI Recommendation | ✅ | Event stream + histori SPK |
| Predictive Maintenance | ✅ | Histori SPK + iot_reading |
| Dashboard KPI | ✅ | Views atas SPK/Timeline/Audit |
| Data Warehouse | ✅ | Append-only event → CDC |
| Business Intelligence | ✅ | Materialized views |
| Audit Trail | ✅ | `spk_audit_log` immutable, retensi 60 bulan finansial |
| Timeline | ✅ | `spk_timeline_event` konsumen event stream |
| Digital Signature | ✅ | `spk_signature` (hash + role + signer + ip) |
| Media Attachment | ✅ | `spk_attachment` + storage bucket + `hash` |
| Custom SPK Builder | ✅ | `spk_form_template` + `spk_form_field` mengatur field/layout, workflow tetap |
| IoT Inspection | ✅ | `spk_iot_reading` |

## 46. Validasi Akhir Model

| Risiko | Ditemukan? | Mitigasi (sudah dalam desain) |
|---|---|---|
| Duplicate entity | ❌ tidak | line_item = SSOT tunggal; estimation & invoice_line = snapshot turunan (§32 R-A). |
| Duplicate ownership | ❌ tidak | Ownership Matrix (§43) memberi 1 write-owner per stage; handoff via status change. |
| Circular relationship | ❌ tidak | Self-ref `spk.parent_spk_id` bersifat DAG (warranty/re-SPK → SPK induk saja), tidak ada cycle. |
| Orphan entity | ❌ tidak | Semua child (line_item, assignment, approval, timeline, audit, attachment, signature, iot_reading, invoice) FK ke `spk_id`. Booking freeze setelah SPK; tidak jadi orphan. |
| Future bottleneck | ⚠️ dimitigasi | Partisi timeline/audit by waktu; materialized view untuk KPI; cold storage untuk attachment. |
| Scalability issue | ⚠️ dimitigasi | Index `(branch_id, status, opened_at)`, `(vehicle_id, opened_at)`, `(customer_id, opened_at)`; RLS scoping per branch/company/franchise siap. |
| Duplicate SSOT (Booking / Invoice / Vehicle History / Analytics) | ❌ tidak | Ditegaskan di §34 & §42 — SPK satu-satunya sumber operasional. |
| Duplicate history (Timeline vs Audit) | ❌ tidak | §18/§19: Timeline = user-facing, Audit = field-level internal. |

## 47. Penutup Phase 3.1

- Phase 3.1 menghasilkan **desain teknis** saja: ERD, Data Dictionary, Ownership Matrix, Scalability Review, Future Compatibility, dan validasi akhir.
- Tidak ada migration SQL, tabel, trigger, realtime, notification, edge function, API, komponen, halaman, atau kode yang dibuat.
- Model dinyatakan **konsisten dengan blueprint LOCKED** (§34–§40).
- Phase 3.2 (migration & implementasi database) hanya boleh dimulai atas perintah eksplisit user.

---

# PHASE 3.2 — SPK Core Engine (Architecture Only)

Referensi tunggal: Blueprint LOCKED (Phase 1 → Phase 2.6) + Phase 3.1 Data Model (§41–47). Tidak ada UI, halaman, komponen, migration SQL, trigger, realtime, notification, API, edge function, atau kode yang dibuat di fase ini. Output = **desain arsitektur engine** saja.

## 48. Prinsip Desain SPK Core Engine

1. **Single point of truth for behavior.** Semua mutasi SPK melewati Engine. UI hanya memanggil facade, tidak menyimpan business logic.
2. **Single Responsibility Principle.** Setiap service mengurus satu tanggung jawab; komposisi via facade `SpkEngine`.
3. **Event-driven internally.** Setiap mutasi menghasilkan domain event → dikonsumsi Timeline, Audit, Notification, Realtime, Analytics, AI.
4. **Append-only mindset.** Estimation, assignment, approval, payment, refund, timeline, audit = append. Tidak ada update destruktif.
5. **DAG only.** Dependensi antar service berbentuk directed-acyclic graph — cross-cutting (EventBus/Timeline/Audit) berada di lapisan sink, bukan di antara core services.
6. **Consumer-agnostic.** Engine tidak tahu siapa pemanggil (Reception, Advisor, Mechanic, QC, Cashier, Customer Portal, Dashboard, Analytics). Otorisasi ditegakkan lewat `OwnershipService` + role context.

## 49. Layer Arsitektur

```text
┌──────────────────────────────────────────────────────────────┐
│ Consumers (read/command only, NO business logic)             │
│  Reception · Advisor · Mechanic · QC · Cashier · Customer    │
│  Dashboard · Analytics · AI                                  │
└──────────────────────────┬───────────────────────────────────┘
                           │ commands / queries
┌──────────────────────────▼───────────────────────────────────┐
│ Facade: SpkEngine                                            │
│  - Orchestrates use-cases, no direct data access             │
└──┬──────────┬──────────┬──────────┬──────────┬───────────────┘
   │          │          │          │          │
┌──▼──┐  ┌───▼──┐   ┌────▼───┐  ┌──▼────┐  ┌──▼────┐  ... (core services)
│Creat│  │Work  │   │LineItem│  │Approv │  │Invoice│
└──┬──┘  └───┬──┘   └────┬───┘  └──┬────┘  └──┬────┘
   └──────┬─┴────────────┴─────────┴──────────┘
          │ emit domain event
┌─────────▼───────────────────────────────────────────────────┐
│ EventBusService (in-process, append-only stream)            │
└─┬─────────┬────────────┬───────────┬───────────┬────────────┘
  │         │            │           │           │
┌─▼──┐  ┌──▼───┐   ┌────▼───┐   ┌──▼────┐   ┌──▼─────┐
│Time│  │Audit │   │Notify  │   │Realtime│   │Analytics│
│line│  │Log   │   │Dispatch│   │Broadcst│   │ KPI/AI │
└────┘  └──────┘   └────────┘   └────────┘   └────────┘
```

Dependency diagram lengkap: `SPK_Engine_Dependencies.mmd`.

## 50. Service Catalog & Responsibility

### Facade

- **SpkEngine** — satu-satunya entry point untuk consumer. Menerjemahkan intent → use-case; tidak menyimpan state. Tidak berkomunikasi langsung dengan DB.

### Core services (write-side)

| Service | Tanggung jawab tunggal | Boleh memanggil |
|---|---|---|
| **SpkCreationService** | Konversi Booking → SPK sekali (§38 R-E). Freeze Booking. | Numbering, Snapshot, Ownership, EventBus |
| **SpkNumberingService** | Generate nomor SPK unik per cabang / periode. Idempotent. | — |
| **WorkflowService** | Orkestrasi transisi §17 (state machine). Validasi state legal. | Status, Ownership, FieldLock, EventBus |
| **StatusTransitionService** | Menyimpan definisi state machine (from → to → guard). Pure logic. | — |
| **OwnershipService** | Menegakkan Ownership Matrix (§43) & SoD (QC≠Mechanic). | — |
| **FieldLockService** | Menentukan field editable per (role, stage). Sumber: `spk_form_template` + rule blueprint. | Template |
| **LineItemService** | CRUD line item selama stage yang diizinkan. SSOT pekerjaan & harga (§32 R-A). | Ownership, FieldLock, EventBus |
| **EstimationVersionService** | Append versi estimasi terkunci saat customer approval / revisi. | LineItem, Snapshot, EventBus |
| **ApprovalService** | Catat approval customer (initial / revised / additional work). Append-only. | Ownership, EventBus |
| **AssignmentService** | Assign & reassign Advisor / Mechanic / QC. Append-only history. SoD check. | Ownership, EventBus |
| **SnapshotService** | Freeze customer/vehicle/branch/pricing/estimation/invoice snapshot. | — |
| **AttachmentService** | Media (foto, dokumen, IoT reading media). Menyimpan `hash`. Append-only. | EventBus |
| **SignatureService** | Digital signature customer/QC/advisor. `hash + ip + signer`. Append-only. | EventBus |
| **InvoiceService** | Generate invoice = snapshot line_items. Immutable pasca payment. | LineItem, Snapshot, EventBus |
| **PaymentService** | Catat pembayaran. Append-only. | Ownership, EventBus |
| **RefundService** | Refund / partial refund via event baru. Butuh Owner approval. | Ownership, EventBus |
| **FormTemplateService** | Kelola `spk_form_template` + `spk_form_field` (Builder). Tidak menyentuh workflow (§17). | — |

### Cross-cutting sinks (read from EventBus, append-only)

| Service | Tanggung jawab |
|---|---|
| **EventBusService** | Publish/subscribe domain events (§37). In-process kontrak; implementasi konkret di Phase 3.3+. |
| **TimelineService** | Konsumen event → `spk_timeline_event` (user-facing). Read API untuk konsumen. |
| **AuditService** | Konsumen event + field diff → `spk_audit_log` (internal, immutable, retensi 60 bulan finansial). |
| **NotificationDispatcher** | Konsumen event → route notifikasi (WA/Email/Push/In-App). Idempotent per event id. |
| **RealtimeBroadcaster** | Konsumen event → broadcast channel per `spk_id` / `branch_id` / `role`. |

### Derived / read-side (query only)

| Service | Tanggung jawab |
|---|---|
| **VehicleHistoryQuery** | Query view SPK per `vehicle_id` (§33 R-C). Tidak menulis. |
| **VehicleHealthComputer** | Compute `vehicle_health_snapshot` dari histori SPK (§33 R-E). Materialized/cache-only. |
| **KpiViewQuery** | Baca view/materialized view KPI (§33 R-D). |
| **AiRecommendationReader** | Baca output AI (di-generate proses async terpisah pada fase future). |

## 51. Engine Responsibilities → Service Mapping

| Engine Responsibility | Owner Service |
|---|---|
| SPK Creation | SpkCreationService |
| SPK Number Generation | SpkNumberingService |
| Workflow State (machine) | StatusTransitionService |
| Lifecycle Management (orchestration) | WorkflowService |
| Ownership Validation | OwnershipService |
| Field Locking | FieldLockService (+ FormTemplateService) |
| Attachment Management | AttachmentService |
| Timeline | TimelineService (sink) |
| Snapshot Generation | SnapshotService |
| History Generation | VehicleHistoryQuery (read-only) |
| Status Transition | WorkflowService + StatusTransitionService |
| Audit Trail | AuditService (sink) |
| Service Mapping (catalog → line_item) | LineItemService (via `service_catalog` / `part_catalog` reference) |

## 52. Lifecycle Flow (Command → Event → Sink)

Contoh transisi kanonik `Awaiting Customer Approval → Approved`:

1. Consumer (Advisor UI atau Customer Portal) memanggil `SpkEngine.approveEstimation({spk_id, actor, decision, signature_ref, note})`.
2. `WorkflowService`:
   - `StatusTransitionService.canTransition(from, to)` → true.
   - `OwnershipService.assertActor(actor, "approval.decision", stage)` → pass (Customer only).
   - `FieldLockService.assertMutable("approval", stage)` → pass.
3. `ApprovalService.append(...)` → row baru di `spk_approval`.
4. `EstimationVersionService.markApproved(version_id)` (jika revisi) atau lock versi aktif.
5. `EventBusService.publish({event: "approval.approved", spk_id, from_status, to_status, actor, at, payload})`.
6. Sink subscribers dijalankan **secara independen & idempotent**:
   - `TimelineService` → append `spk_timeline_event`.
   - `AuditService` → append `spk_audit_log` dengan field diff.
   - `NotificationDispatcher` → notify Advisor / Mechanic / Reception.
   - `RealtimeBroadcaster` → broadcast ke channel `spk:{id}`.
7. Consumer menerima hasil (sukses/gagal). Semua efek samping = konsekuensi event, bukan dipanggil consumer.

Pola sama diterapkan untuk seluruh transisi §17 dan event §37.

## 53. Dependency Review

- **Single Responsibility:** setiap service pada §50 memiliki satu tanggung jawab. Tidak ada service yang menggabungkan write + notify + audit.
- **Circular dependency check:** cross-cutting (EventBus, Timeline, Audit, Notify, Realtime) **hanya subscriber**, tidak pernah dipanggil balik oleh core services. Core services **tidak** memanggil sinks langsung → tidak ada cycle.
- **UI tidak menyimpan business logic:** UI hanya memanggil facade `SpkEngine` + membaca view/query. Enforcement: konsumen tidak boleh mengakses service internal langsung.
- **DB coupling terisolasi:** core service memiliki repository interface (nanti diimplementasikan di Phase 3.3+). Consumer tidak query tabel operasional langsung untuk mutasi.
- **Idempotency:** semua sink berkonsumsi event via `event_id` unik → aman untuk retry.

Verifikasi topologis pada `SPK_Engine_Dependencies.mmd`: DAG (tidak ada edge balik ke core dari sink).

## 54. Future Compatibility

| Kebutuhan future | Kompatibel? | Basis |
|---|---|---|
| Multi Cabang | ✅ | `branch_id` di setiap command; RLS + OwnershipService memakai branch scope. |
| Fleet | ✅ | `customer.is_fleet` + agregasi via VehicleHistoryQuery. Tidak mengubah engine. |
| Corporate Customer | ✅ | Slot `company_id` diteruskan lewat context; SnapshotService menyimpannya di SPK. |
| AI Recommendation | ✅ | Consumer read-side (AiRecommendationReader) + EventBus sebagai feeder pipeline AI eksternal. |
| Vehicle Health | ✅ | VehicleHealthComputer read-side, computed dari histori SPK. |
| Mobile Mechanic / On-site | ✅ | `service_mode` di SPK; AttachmentService + IoT reading kompatibel offline. |
| Offline Sync | ✅ | Command envelope idempotent (`command_id`); EventBus append-only mendukung replay saat online. |
| Digital Signature | ✅ | SignatureService independen; dipakai oleh ApprovalService & QC. |
| Dynamic SPK Builder | ✅ | FormTemplateService + FieldLockService memisahkan konfigurasi field/layout dari workflow. |

## 55. Validasi Akhir

| Risiko | Ditemukan? | Mitigasi |
|---|---|---|
| Business logic di UI | ❌ | Facade `SpkEngine` = satu-satunya entry; consumer stateless. |
| Duplikasi logic antar service | ❌ | State machine terpusat di StatusTransitionService; ownership di OwnershipService. |
| Circular dependency | ❌ | DAG (§53); sinks tidak dipanggil core. |
| God service | ❌ | Facade tipis; tidak ada service > 1 tanggung jawab. |
| Coupling ke DB | ❌ pada level desain | Repository interface disiapkan; implementasi konkret di Phase 3.3+. |
| Sink memblokir command | ⚠️ dimitigasi | Sink konsumen event async/idempotent; kegagalan sink tidak membatalkan transisi. |
| Konflik ownership antar consumer | ❌ | OwnershipService tunggal; SoD (QC≠Mechanic) hard-check. |
| Duplicate SSOT | ❌ | Engine tetap menegakkan SPK sebagai SSOT (§34); Invoice/Timeline/Audit = konsumen. |

## 56. Penutup Phase 3.2

- Phase 3.2 menghasilkan **desain arsitektur SPK Core Engine**: prinsip, layer, katalog service, mapping tanggung jawab, lifecycle flow, dependency review, future compatibility, dan validasi akhir.
- Tidak ada UI, halaman, komponen, migration SQL, trigger, realtime, notification, API, edge function, atau kode yang dibuat.
- Desain **konsisten** dengan Blueprint LOCKED (§34–§40) dan Data Model Phase 3.1 (§41–§47).
- Phase 3.3 (implementasi repository + migration SQL) hanya boleh dimulai atas perintah eksplisit user.
