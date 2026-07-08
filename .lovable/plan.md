
# Workshop Management Engine (SPK) — Blueprint Arsitektur

Dokumen ini adalah **rancangan fondasi**, bukan implementasi. Tidak ada perubahan kode / database pada tahap ini. Tujuannya menjadikan **SPK (Surat Perintah Kerja)** sebagai *engine* operasional utama bengkel yang **berdiri sendiri**, sementara Booking, Walk-in, Invoice, Payment, Notification, dan Dashboard menjadi **sumber input** atau **konsumen output**.

---

## 1. Prinsip Arsitektur

1. **SPK-centric, bukan Booking-centric.** SPK adalah *root entity* pekerjaan bengkel. Booking hanya salah satu *origin*.
2. **Origin-agnostic.** SPK dapat dibuat dari: Booking, Walk-in, Fleet Contract, Warranty Claim, Emergency Call, Internal Job.
3. **Config over Code.** Workflow, status, checklist, field, role, SLA, automation — semuanya *data-driven*, diatur dari dashboard.
4. **Backward Compatible.** Semua tabel existing (bookings, invoices, payments, vehicles, customers, user_roles, notifications) tetap utuh. SPK berdiri di *layer* baru dan hanya *reference* ke entity existing.
5. **Additive Only.** Tahap awal hanya menambah tabel/kolom baru. Tidak ada rename/drop.
6. **Event-driven.** Setiap perubahan SPK memancarkan event; Notification, Invoice, Dashboard, Loyalty berlangganan.

---

## 2. Peta Sistem Existing → Peran dalam Engine

| Modul Existing        | Peran terhadap SPK                                                    |
| --------------------- | --------------------------------------------------------------------- |
| Booking               | *Origin* opsional. SPK menyimpan `origin_booking_id` (nullable).      |
| Customer & Vehicle    | *Reference* wajib. SPK selalu punya `customer_id` + `vehicle_id`.     |
| Invoice / Payment     | *Downstream*. Invoice di-generate dari SPK final, bukan dari Booking. |
| Notification          | *Subscriber* event SPK (assign, status, approval, SLA breach).        |
| Role & Permission     | *Guard*. SPK punya matrix role per-action, bukan hanya per-page.      |
| Dashboard             | *Consumer*. Widget baru: SPK aktif, antrian, SLA, teknisi load.       |
| Update / Version Mgr  | Tidak berubah. Engine ikut versi aplikasi biasa.                      |
| Audit Log             | Extended: semua transisi SPK tercatat immutable.                      |

---

## 3. Modul yang Diperlukan

### 3.1 Core Engine
- **SPK Registry** — entity utama, ID sekuensial (`SPK-YYYYMM-XXXX`).
- **Origin Adapter** — normalisasi input dari Booking / Walk-in / Fleet / Warranty / Emergency ke payload SPK.
- **Workflow Runner** — state machine yang membaca definisi workflow dari config.
- **Event Bus** — publish `spk.created`, `spk.status_changed`, `spk.approved`, `spk.sla_breached`, `spk.completed`.

### 3.2 Configuration Layer (dashboard-driven)
- **Workflow Designer** — CRUD status + transisi (graph). Multiple workflows aktif paralel.
- **Template Manager** — template SPK per jenis kerja: Ban, Service Berkala, Fleet, Warranty, Emergency, Body Repair, Diagnostic-only, dll.
- **Field Toggle** — enable/disable/required per field per template.
- **Checklist Builder** — checklist inspeksi (kategori → item → tipe input: bool/rating/foto/angka/catatan).
- **Role & Approval Matrix** — siapa boleh create/edit/approve/close per status per template.
- **SLA Policy** — durasi target per status, eskalasi, warning threshold.
- **Automation Rules** — trigger → condition → action (mis. status=completed → generate invoice, kirim WA, tambah loyalty).

### 3.3 Operational Modules
- **Job Board / Kanban** — view teknisi & service advisor.
- **Inspection Runner** — eksekusi checklist di lapangan (mobile-friendly).
- **Parts & Labor Lines** — item pekerjaan + suku cadang, sumber harga dari service catalog & tire inventory existing.
- **Approval Console** — customer approval (WA link / signed URL) & internal approval.
- **Handover & QC** — foto sebelum/sesudah, tanda tangan digital.
- **Invoice Bridge** — sinkronisasi SPK final → invoice existing.

### 3.4 Observability
- **SPK Audit Trail** (extend `audit_logs` existing).
- **SLA Monitor** dashboard.
- **Technician Performance** report (masuk Reports Hub existing).

---

## 4. Model Data (konseptual, belum dibuat)

```text
spk_templates            (id, name, code, description, active)
spk_workflows            (id, template_id, name, is_default)
spk_workflow_statuses    (id, workflow_id, code, label, order, is_terminal, color)
spk_workflow_transitions (id, workflow_id, from_status, to_status, required_role, requires_approval, sla_minutes)
spk_field_configs        (id, template_id, field_key, enabled, required, label_override)
spk_checklist_groups     (id, template_id, name, order)
spk_checklist_items      (id, group_id, label, input_type, options, required, order)
spk_role_matrix          (id, template_id, status_code, role, can_edit, can_approve, can_close)
spk_automation_rules     (id, template_id, trigger_event, condition_json, action_json)

spk                      (id, code, template_id, workflow_id, origin_type, origin_ref_id,
                          customer_id, vehicle_id, branch_id, current_status,
                          assigned_technician_id, service_advisor_id,
                          opened_at, closed_at, sla_due_at, meta_json)
spk_lines                (id, spk_id, kind[service|part|labor|fee], ref_id, qty, price, discount, note)
spk_checklist_responses  (id, spk_id, item_id, value_json, photo_url, technician_id, at)
spk_status_history       (id, spk_id, from, to, by_user, at, note)
spk_approvals            (id, spk_id, kind[customer|internal], approver, decision, at, signature_url)
spk_events               (id, spk_id, type, payload_json, at)  -- optional if using audit_logs
```

Semua tabel `public.*` — bila diimplementasikan nanti — akan mengikuti aturan project: **GRANT + RLS + policy** sesuai matrix role.

---

## 5. Diagram Alur Operasional

```text
                +-------------------+
                |   ORIGIN SOURCES  |
                |-------------------|
                | Booking           |
                | Walk-in           |
                | Fleet Contract    |
                | Warranty Claim    |
                | Emergency Call    |
                +---------+---------+
                          |
                          v
                +-------------------+       reads       +---------------------+
                |  Origin Adapter   |------------------>|  Config Layer        |
                |  (normalize)      |                   |  (template,workflow, |
                +---------+---------+                   |   fields,checklist,  |
                          |                             |   roles,SLA,rules)   |
                          v                             +----------+-----------+
                +-------------------+                              |
                |     SPK CREATE    |<-----------------------------+
                +---------+---------+
                          |
                          v
     +--------------------+---------------------+
     |            WORKFLOW RUNNER               |
     |  status: draft -> inspect -> approval    |
     |          -> in_progress -> qc -> done    |
     |  (configurable per template)             |
     +--------------------+---------------------+
                          |
        +-----------------+------------------+
        |                 |                  |
        v                 v                  v
  Inspection        Approval Console    Parts & Labor
  Checklist         (customer/internal) (catalog/tire inv)
        |                 |                  |
        +--------+--------+------------------+
                 |
                 v
           +-----------+       events       +----------------+
           |  SPK DONE |-------------------->| Event Bus       |
           +-----+-----+                    +---+----+----+---+
                 |                              |    |    |
                 v                              v    v    v
           Invoice Bridge                Notify  Loyalty  Dashboard
           (existing invoice)            (WA/Push) (points) (widgets)
```

---

## 6. Kompatibilitas dengan Sistem Existing

- **Booking** tetap punya siklus sendiri; saat status booking `confirmed`/`in_progress` engine boleh membuat SPK otomatis (opsional, diatur di automation rules). Booking **tidak menjadi parent** SPK.
- **Invoice / Payment** — SPK menghasilkan invoice via *bridge* yang memanggil generator invoice existing. Skema invoice tidak diubah.
- **Notification** — engine mem-publish event; subscriber yang sudah ada (WA, push, email) memakai payload standar.
- **Role** — tidak menambah role baru di enum DB. Matrix diletakkan di `spk_role_matrix` yang me-*resolve* role existing (`staff`, `admin`, `admin_cabang`, `customer`).
- **Update Manager & Versioning** — di luar cakupan; engine ikut lifecycle rilis biasa.

---

## 7. Urutan Implementasi (paling aman → paling berdampak)

**Fase 0 — Blueprint & Governance (tahap ini).**
Dokumen ini + review stakeholder. Tidak ada perubahan sistem.

**Fase 1 — Config Skeleton (read-only, additive).**
Buat tabel `spk_templates`, `spk_workflows`, `spk_workflow_statuses`, `spk_workflow_transitions` + seed default. Dashboard read-only viewer. Tidak menyentuh alur bengkel yang berjalan.

**Fase 2 — SPK Core (shadow mode).**
Tabel `spk`, `spk_lines`, `spk_status_history`. Bisa dibuat manual dari dashboard, **tanpa** integrasi ke invoice/notification. Dipakai pilot 1 cabang.

**Fase 3 — Origin Adapter: Walk-in.**
Form walk-in → SPK. Belum menyentuh booking. Aman karena walk-in belum ada engine-nya hari ini.

**Fase 4 — Configurable Fields & Checklist.**
`spk_field_configs`, `spk_checklist_groups`, `spk_checklist_items`, `spk_checklist_responses`. Dashboard builder.

**Fase 5 — Workflow Runner + Role Matrix + Approval.**
State machine aktif, guard by `spk_role_matrix`. Approval console (internal dulu, customer belakangan).

**Fase 6 — Event Bus + Notification Subscriber.**
Sambungkan ke WA/push existing. Reversible via feature flag per template.

**Fase 7 — Origin Adapter: Booking.**
Booking `confirmed` → auto/manual create SPK. Booking tetap independen, hanya menyimpan `spk_id` opsional untuk referensi balik.

**Fase 8 — Invoice Bridge.**
SPK final → invoice existing. Rilis di belakang feature flag; fallback: alur invoice lama tetap jalan.

**Fase 9 — SLA + Automation Rules.**
`spk_automation_rules`, SLA monitor, eskalasi. Ini paling berisiko → dirilis terakhir.

**Fase 10 — Origin Adapter: Fleet, Warranty, Emergency + Reports Hub integration.**

Setiap fase punya *kill switch* (feature flag di `app_settings`) dan tidak mengubah tabel existing.

---

## 8. Risiko & Mitigasi

| Risiko                                       | Mitigasi                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Duplikasi state antara Booking & SPK         | SPK sebagai *source of truth* pekerjaan; Booking hanya *intent*.         |
| RLS bocor karena tabel baru                  | Wajib GRANT + policy per tabel; review scanner sebelum go-live tiap fase.|
| Workflow config salah menutup transisi       | Validator config + simulator di dashboard sebelum publish.               |
| Notification spam saat automation aktif      | Rate-limit per SPK + preview mode.                                       |
| Invoice ganda (bridge + alur lama)           | Bridge idempotent by `spk_id`; feature flag per branch.                  |
| Perubahan breaking di Reports/Dashboard      | Widget SPK di panel terpisah, tidak menimpa widget booking.              |

---

## 9. Deliverable Tahap Ini

- Blueprint (dokumen ini).
- Diagram alur (bagian 5).
- Daftar modul (bagian 3).
- Model data konseptual (bagian 4).
- Roadmap fase 0–10 (bagian 7).

Belum ada migrasi DB, belum ada kode. Implementasi menunggu persetujuan urutan fase dan cakupan Fase 1.

---

### Pertanyaan yang perlu dijawab sebelum Fase 1

1. Apakah SPK default punya **satu workflow global** atau **satu workflow per template** sejak awal?
2. Pilot Fase 2 di cabang mana?
3. Apakah customer approval (WA signed link) masuk MVP atau ditunda ke Fase 6+?
4. Format nomor SPK: `SPK-YYYYMM-XXXX` atau mengikuti pola invoice existing?
