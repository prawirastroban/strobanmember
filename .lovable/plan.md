
# Phase 1 — SPK Business Flow Validation Report

Analisis murni. Tidak ada migrasi DB, tidak ada perubahan kode, tidak ada halaman baru, tidak menyentuh alur booking existing.

---

## 1. Alur yang Diusulkan (Unified SPK Flow)

```text
Customer
  │
  ├── Online Booking ──┐
  │                    │
  └── Walk-In ─────────┤
                       ▼
                   CHECK-IN  (titik konvergensi — SPK belum ada)
                       │
                       ▼
                  CREATE SPK  (satu format, apapun origin)
                       │
                       ▼
              VEHICLE INSPECTION (checklist konfigurable)
                       │
                       ▼
              CUSTOMER APPROVAL (estimasi biaya + lingkup kerja)
                       │
                       ▼
                MECHANIC WORK  (assign teknisi, progress)
                       │
                       ▼
               QUALITY CONTROL (QC + foto sebelum/sesudah)
                       │
                       ▼
                    CASHIER  (settle pembayaran)
                       │
                       ▼
                    INVOICE  (generate dari SPK final)
                       │
                       ▼
              VEHICLE HISTORY (append per vehicle_id)
                       │
                       ▼
                   ANALYTICS  (SLA, teknisi, revenue, retensi)
```

**Prinsip kunci:** Booking dan Walk-In hanya "cara masuk". Setelah **Check-In**, semua kendaraan berjalan di **satu jalur SPK yang identik**. SPK adalah *source of truth*; Booking hanya *intent*, Invoice hanya *output*.

---

## 2. Validasi terhadap Arsitektur Existing

| Tahap Usulan       | Modul Existing yang Menopang                                                                 | Status         |
| ------------------ | -------------------------------------------------------------------------------------------- | -------------- |
| Booking            | `bookings`, `MobileBookingWizard`, `StaffQuickBookingDialog`, `PublicBookingTracker`         | ✅ Ada         |
| Walk-In            | `StaffQuickBookingDialog` (bisa dipakai sebagai walk-in), belum ada label eksplisit          | ⚠️ Parsial     |
| Check-In           | `bookingStatus.ts` punya legacy `checked_in`, tapi bukan langkah eksplisit di alur canonical | ⚠️ Perlu formalisasi |
| Create SPK         | **Belum ada** entity SPK                                                                     | ❌ Baru        |
| Vehicle Inspection | Belum ada checklist runner                                                                   | ❌ Baru        |
| Customer Approval  | Belum ada approval console; `PublicBookingTracker` (WA signed link) bisa dipakai pola-nya    | ❌ Baru        |
| Mechanic Work      | `LiveProgressTracker`, `ServiceProgress`, status `in_progress`                               | ✅ Ada, perlu binding ke SPK |
| Quality Control    | Belum ada tahap QC formal                                                                    | ❌ Baru        |
| Cashier            | `PaymentDialog`, `ManualPayment`, Midtrans functions                                         | ✅ Ada         |
| Invoice            | `InvoiceView`, generator `INV-000001`, financial system                                      | ✅ Ada         |
| Vehicle History    | `HistoryPerawatan`, `VehicleDetail`, `ServiceHistory`                                        | ✅ Ada, perlu subscribe event SPK |
| Analytics          | Reports Hub, `analytics-insights`, `ga4-analytics`, Dashboard KPI                            | ✅ Ada, perlu widget SPK |

**Kesimpulan kompatibilitas:** Alur usulan **kompatibel penuh** dengan sistem existing. Modul cashier/invoice/history/analytics tinggal *berlangganan* event SPK. Yang benar-benar baru: Check-In formal, SPK entity, Inspection, Approval, QC.

---

## 3. Missing Steps

1. **Check-In formal.** Saat ini `checked_in` cuma legacy status booking; tidak ada UI/aksi khusus. Perlu jadi *gate* eksplisit ke SPK, bukan sekadar label.
2. **Origin = Walk-In.** `StaffQuickBookingDialog` menulis ke `bookings`, tapi tidak menandai walk-in vs online. Perlu field `origin_type` (bookings tetap, hanya kolom baru di SPK).
3. **Estimasi biaya sebelum Approval.** Belum ada layer "quotation" — sekarang harga langsung fixed di service catalog. Approval butuh snapshot estimasi.
4. **QC Gate.** Tidak ada tahap antara "mechanic done" dan "cashier".
5. **Hand-off SPK → Invoice yang idempotent.** Sekarang invoice bisa dibuat dari booking; perlu bridge dari SPK agar tidak dobel.
6. **Vehicle History event source.** History hari ini diturunkan dari booking; harus diturunkan dari SPK final agar walk-in juga tercatat.

## 4. Duplicate Processes (risiko)

- **Booking status vs SPK status.** Kalau booking tetap punya `in_progress`, `completed` sementara SPK juga punya, dua kebenaran berjalan paralel → laporan bisa beda. **Mitigasi:** setelah SPK dibuat, booking status di-*freeze* di `checked_in` (atau `confirmed`) dan tidak lagi diubah oleh flow operasional; hanya SPK yang bergerak.
- **Invoice dari booking vs dari SPK.** Alur invoice lama masih hidup. **Mitigasi:** feature flag per cabang; bridge idempotent by `spk_id`.
- **LiveProgressTracker** subscribe ke booking; nanti perlu juga subscribe ke SPK. Jangan dua tracker paralel — satu komponen, dua sumber (union view) atau ganti sumber ke SPK saat SPK ada.
- **Notifikasi.** `notify-booking-status` dan (nanti) `notify-spk-status` bisa dobel-kirim. **Mitigasi:** satu dispatcher, dedup by `(entity_type, entity_id, event)`.

## 5. Potential Bottlenecks

- **Customer Approval async.** Kalau customer lambat balas WA, mobil menganggur di bay. Butuh SLA + auto-reminder + fallback "approval by phone (staff mencatat)".
- **Inspection checklist panjang.** Mobile teknisi. Kalau tidak dipecah per grup + auto-save, teknisi drop.
- **QC bottleneck 1 orang.** Perlu role QC yang bisa di-*delegate* (bukan hanya 1 admin).
- **Cashier antrian.** Kalau cashier menunggu SPK "closed", peak hour tumpuk. Perlu status `awaiting_payment` yang bisa paralel dengan mobil sudah keluar bay.

## 6. UX Risks

- **Walk-in customer diminta booking dulu.** Kalau staff dipaksa buat "booking dummy" untuk walk-in, itu UX buruk untuk staff. Walk-in harus 1-tap → Check-In → SPK, tanpa slot/tanggal.
- **Approval via WA link** butuh HP customer aktif. Fallback tanda tangan digital di tablet cabang wajib.
- **Terlalu banyak status** membingungkan customer. Public tracker (`/t/:token`) harus tetap 4–5 langkah besar, walau internal SPK punya 8–10 status.
- **Legacy status** (`checked_in`, `finishing`, `ready`, `installed`) di `bookingStatus.ts` bisa bikin bingung staff kalau tidak ditransisikan bersih.

## 7. Data Consistency Risks

- **Dobel source of truth** (booking vs SPK) — sudah dibahas. Aturan: begitu SPK exists, semua field operasional dibaca dari SPK.
- **Vehicle snapshot.** Booking existing sudah pakai *static DB snapshot vehicle* — bagus. SPK harus ikut pola sama, jangan foreign key hidup ke `vehicles` untuk field yang dicetak di invoice.
- **Pricing drift.** Harga service catalog bisa berubah antara "Approval" dan "Invoice". SPK harus menyimpan **line snapshot** (kind, ref_id, qty, price, discount) — tidak reference harga live.
- **Customer identity walk-in.** Walk-in bisa saja tidak punya akun. Perlu kebijakan: buat *lightweight customer record* + tag `acquisition_source='walk_in'` (pola sudah ada untuk `staff_created`).
- **Race condition** Approval vs Cancel. Kalau customer approve saat staff cancel — perlu optimistic lock (versioning) di SPK.
- **Refund / partial payment** setelah invoice terbit — harus dicerminkan balik ke SPK status (`refunded`, `partial`), bukan hanya di invoice.

---

## 8. Konfigurabilitas Form SPK di Masa Depan

Alur ini **tidak berubah** meski form SPK dikonfigurasi ulang, karena:

- Workflow (7 tahap besar) adalah **struktur**; field/checklist adalah **konten**.
- Konten diatur oleh `spk_templates` + `spk_field_configs` + `spk_checklist_groups/items` (rencana Fase 4 blueprint).
- Setiap template menunjuk workflow default, tapi 7 tahap besar (Check-In → Analytics) adalah *invariant*. Yang boleh berubah: sub-status di dalam **Mechanic Work** (mis. "dismantle", "diagnose", "repair"), isi checklist, field yang tampil.
- Approval, QC, Cashier tetap ada — bisa *skip-able* per template (mis. template "diagnostic-only" skip Cashier kalau gratis) via flag `is_optional` di transition, bukan mengubah alur.

**Verdict:** Alur ini *future-proof* untuk konfigurasi form.

---

## 9. Rekomendasi

1. **Terima alur 7-tahap** sebagai fondasi jangka panjang, dengan catatan:
   - Formalkan **Check-In** sebagai aksi eksplisit (bukan hanya status booking legacy).
   - Tambahkan **Estimation/Quotation** sebagai sub-tahap di dalam "Create SPK" atau tepat sebelum "Customer Approval" — jangan dijadikan tahap ke-8 karena akan membebani UI customer.
   - **QC** boleh *optional per template* tapi *default on* untuk service berat.

2. **Booking di-freeze setelah Check-In.** Status booking berhenti di `checked_in`. Semua transisi berikutnya milik SPK. `LiveProgressTracker` publik membaca union (booking pra-check-in, SPK pasca-check-in) via satu view.

3. **Walk-In tidak menulis ke `bookings`.** Buat entry SPK langsung dengan `origin_type='walk_in'`, tanpa membuat booking dummy. Ini menghilangkan *duplicate process* di titik masuk.

4. **Notifikasi konsolidasi.** Satu dispatcher (`dispatch-notification` existing sudah generik) melayani event booking *dan* SPK, dengan dedup key.

5. **Invoice bridge idempotent** — 1 SPK ≤ 1 invoice; hindari alur "invoice dari booking" berjalan paralel untuk SPK yang sama. Feature flag per cabang saat rollout.

6. **Analytics diperluas**, bukan diganti: Reports Hub tetap; tambah kategori "SPK Ops" (SLA per tahap, teknisi throughput, approval turnaround, QC reject rate).

7. **Legacy status booking** (`finishing`, `ready`, `installed`) di-*retire* pelan — mapping ke SPK status di layer view, jangan hapus data lama.

---

## 10. Konfirmasi

**Alur yang diusulkan LAYAK dijadikan fondasi jangka panjang modul SPK**, dengan penyesuaian minor:

- Check-In diformalkan sebagai action.
- Quotation/Estimation ditempatkan sebagai sub-langkah, bukan tahap terpisah.
- Walk-In langsung ke SPK, tidak lewat `bookings`.
- Booking di-freeze setelah Check-In untuk menghindari dobel *source of truth*.

Tidak ada perubahan kode/DB pada fase ini. Setelah alur ini disetujui, langkah berikutnya adalah **Fase 1 Blueprint (Config Skeleton read-only)** seperti yang sudah diuraikan di `.lovable/plan.md`.

### Pertanyaan yang perlu dijawab sebelum lanjut

1. Setujui **Booking freeze di `checked_in`** (booking tidak lagi bergerak setelah SPK dibuat)?
2. Walk-In: **langsung SPK tanpa row di `bookings`**, atau tetap tulis booking dummy untuk konsistensi laporan lama?
3. **Quotation/Estimation**: masuk sebagai sub-langkah Create SPK, atau tahap terpisah antara Inspection dan Approval?
4. **QC**: wajib untuk semua template, atau optional per template dengan default on untuk service berat?
