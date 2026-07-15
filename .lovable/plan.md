# Rencana: Bersihkan Hasil SPK & Audit Flow

## 1. Bersihkan field yang tidak punya input form
Di `src/lib/spk/spkDisplayMap.ts` (satu-satunya sumber tampilan hasil SPK — dipakai Canvas, `SPKPrint`, `SPKCustomerApprove`, PDF), hapus baris berikut:

**Blok PELANGGAN**
- `Alamat` (`customer_address`) — tidak ada input di `CustomerCard`.

**Blok KENDARAAN**
- `Warna` (`vehicle_color`)
- `No. Rangka` (`vehicle_vin`)
- `No. Mesin` (`vehicle_engine_no`)

Hasil akhir: PELANGGAN = Nama · No. HP · Platform. KENDARAAN = Kendaraan · Plat Nomor · Odometer.

Tidak ada perubahan schema DB — field cuma disembunyikan dari tampilan. Data lama tetap aman kalau di kemudian hari mau ditampilkan lagi.

## 2. Hasil Audit Flow SPK Saat Ini

**Flow yang berjalan (verified di kode):**

```text
Draft (Admin isi Section 1–4)
  │  signature_admin + signature_customer di Section 4
  ▼
awaiting_customer_approval
  │  Customer approve via /spk/:id/approve  (RPC customer_approve_spk)
  │  atau Bypass di device bengkel (CustomerBypassApprove)
  ▼
in_progress   ── WorkflowService auto-fill: date_in, time_in, time_start
  │  Mekanik isi Section 5–10
  ▼
work_completed / qc_pending  ── auto-fill: time_end_work
  │  Mekanik isi Section 11 (Final Check + signature_mekanik)
  ▼
closed  ── gate: signature_mekanik WAJIB
           auto-fill: time_end, time_out, date_out, time_duration, mechanic_name
```

**Yang sudah rapi ✅**
- Time tracking otomatis + gate signature mekanik (WorkflowService).
- Autosave debounced + flush on `beforeunload` (`useSPKAutosave`).
- Timeline events pakai label deskriptif (`eventLabels.ts`).
- Role-scoped RLS: mekanik/head_mekanik hanya lihat cabangnya.
- One-click `Selesaikan SPK Sekarang` (`useSPKWorkflow.finishSpk`).
- PDF & halaman customer sinkron via `buildSpkDisplay`.

**Yang masih janggal / kandidat perbaikan ⚠️**

| # | Temuan | Dampak |
|---|--------|--------|
| A | `spkDisplayMap` menampilkan Alamat / Warna / VIN / Engine No padahal tidak ada input | Selalu tampil `—`, mengotori PDF & halaman customer *(dibereskan di step 1)* |
| B | `INITIAL_VALUES` (Budi Santoso, Avanza) masih di-hard-code di `SPKCanvas.tsx` untuk design-mode | Beresiko bocor kalau developer lupa; sudah pernah jadi bug sebelumnya |
| C | Legacy `signature_qc` masih dibaca sebagai fallback di `spkDisplayMap` | Aman, tapi bikin bingung — role QC sudah dihapus |
| D | `TimeTrackingCard` (Section 10) read-only sepenuhnya, sedangkan `date_in/time_in` diisi otomatis saat transisi ke `in_progress` — kalau admin skip transisi, kartu ini akan kosong sampai mekanik mulai | Perlu didokumentasi di UI atau di-backfill saat customer approve |
| E | Bypass approve (staff tandatangan atas nama customer) tidak menandai flag audit — sulit dibedakan dari approval asli di timeline | Kepatuhan/audit |
| F | Textarea Section 5–9: revisi UX auto-scroll masih agresif kalau user pindah section via tap navigation di tengah mengetik | UX kecil |
| G | Tidak ada indikator eksplisit "SPK butuh signature mekanik" sebelum tombol `Selesaikan` — user baru tahu setelah gagal transisi | UX |

## 3. Yang akan saya kerjakan sekarang (butuh approval)

- **Wajib (permintaan user):** Step 1 — hapus 4 field dari `spkDisplayMap`.
- **Opsional (butuh persetujuan Anda):** perbaikan B, C, D, E, F, G di atas.

Setelah plan ini diapprove, saya jalankan Step 1 dulu. Untuk perbaikan opsional, mohon isi textarea "Rekomendasi Perbaikan" (di UI review plan Lovable) — sebutkan huruf (B/C/D/E/F/G) atau tulis bebas hal lain yang ingin diperbaiki, dan saya kerjakan di iterasi berikutnya.
