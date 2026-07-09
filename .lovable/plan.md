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
