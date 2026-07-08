# Phase 1 — SPK Digital Specification (FINAL)

> **Status:** ✅ FINAL — Phase 1 Specification (locked)
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
