## Diagnosa

Root cause dari "PDF kosong padahal dashboard sudah diisi": **field code mismatch** antara Canvas Runtime (yang menulis ke `spk_orders.data`) dan template PDF/Customer view (yang membaca dari `spk_orders.data`).

Contoh nyata yang ditemukan di codebase:

| Bagian | Canvas menulis (Runtime) | PDF/CustomerApprove membaca | Status |
|---|---|---|---|
| Engine | `engine_oil`, `brake_fluid`, `spark_plug`, `battery`, `v_belt`, `coolant`, `brake_pad_front`, … | `engine_air_filter`, `engine_oil_filter`, `engine_fuel_filter`, `engine_battery`, `engine_radiator`, `engine_vbelt`, `engine_timing_belt`, `engine_busi` | ❌ mismatch total |
| AC | `ac_compressor`, `ac_condensor`, `ac_magnetic_clutch`, `ac_pipe`, `ac_evaporator`, … | `ac_compressor` ✓, `ac_condenser` (typo beda), `ac_freon`, `ac_temp` | ❌ sebagian |
| Suspension/Brake | `insp_suspension_ball_joint`, `insp_suspension_shock_absorber`, `insp_suspension_wheel_bearing`, `insp_suspension_control_arm` | `insp_suspension_front/rear`, `insp_ball_joint`, `insp_tie_rod`, `insp_brake_front/rear` | ❌ mismatch |
| Customer / Vehicle / Service Order / Tyre / Signatures | sama | sama | ✅ (itu sebabnya nama customer + oli merek + tyre muncul di PDF) |

Approval sudah benar di sisi DB (`customer_approve_spk` RPC transisi `awaiting_customer_approval → qc_pending`). Yang belum: jika downstream (QC) belum mengizinkan closing karena workflow rule, tidak ada UI escape ke "kirim revisi". Perlu tombol revisi permanen untuk staff.

---

## Rencana Perbaikan

### 1. Peta sinkronisasi data (satu sumber kebenaran)

**Buat `src/lib/spk/spkDisplayMap.ts`** — satu fungsi `buildSpkDisplay(spk.data)` yang menormalkan `data` menjadi struktur konsisten yang dipakai PDF & Customer view:

- Untuk tiap field yang ada di kedua template, coba key Canvas dulu, fallback ke key lama, lalu `null`.
- Kelompok yang dinormalkan:
  - `engine[]` — pakai `ENGINE_ITEMS` dari `InspectionEngineCard` (14 item asli), plus lamps & electrical.
  - `ac[]` — 13 item dari `ACCheckCard`.
  - `suspension[]` — 4 item dari `InspectionSuspensionCard` + part replacement note.
  - `tyre` — sama (sudah cocok).
  - `serviceOrder` — sama.
  - `signatures` — sama.
- Konversi OK/NOT/N/A/boolean → label seragam (`OK` / `Perlu Perhatian` / `N/A` / `—`).

### 2. Rewrite `src/pages/spk/SPKPrint.tsx` supaya konsisten & berwarna

- Baca via `buildSpkDisplay` (bukan hardcode key lama).
- Tabel item pakai badge warna inline-style (agar `html2canvas` menangkapnya):
  - OK → hijau lembut (bg `#DCFCE7`, text `#166534`)
  - NOT/Perlu Perhatian → merah lembut (bg `#FEE2E2`, text `#991B1B`)
  - N/A → abu (bg `#F1F5F9`, text `#475569`)
  - Belum diisi → outline putus-putus + `—`
- Header pakai aksen merah brand (#ff2b2b) sebagai strip atas + label "STROBAN SERVICE".
- Section title diberi bar warna merah kiri (border-l-4).
- Tambah legend kecil (OK / Perlu Perhatian / N/A) di atas grid pertama.
- Signature blok: tanda tangan customer diberi highlight hijau jika ada, admin/QC abu-abu default.
- Pastikan `html2canvas` di-render dengan `windowWidth: 794` supaya PDF tidak terpotong pada layar kecil.

### 3. Sync `src/pages/spk/SPKCustomerApprove.tsx`

- Ganti `detailGroups` hardcoded menjadi hasil `buildSpkDisplay(spk.data)`.
- Terapkan chip warna sama (OK/NOT/N/A) supaya customer melihat isi yang identik dengan PDF.
- Tampilkan revision note bila ada (dari `data.customer_revision_note`) di banner atas.

### 4. Fix jaminan status flip setelah approve

- Setelah `customer_approve_spk` sukses, sudah ada re-fetch. Perkuat:
  - Fallback: jika status masih `awaiting_customer_approval` setelah RPC (misal race), retry `.update({ status: 'qc_pending' })` via RPC yang sama (idempotent, sudah didukung).
  - Toast sukses hanya muncul saat status benar-benar `qc_pending` atau lebih maju.

### 5. Izinkan revisi meskipun workflow "terkunci" (staff-side escape)

Sesuai permintaan "jika terikat rules workflow atau config, allow untuk revisi":

- Tambahkan tombol **"Minta Revisi ke Mekanik"** di `SPKCanvas.tsx` action bar untuk role `staff` / `admin` / `admin_cabang` yang **selalu tersedia** ketika status ∈ `{qc_pending, awaiting_customer_approval, closed_pending}`.
- Aksi: panggil workflow transition ke `in_progress`; jika gagal karena rule, fallback ke direct update via edge function `admin-user-ops` (tambahkan action baru `spk_force_revision` yang: cek role admin/staff, update `status = 'in_progress'`, insert `spk_events` `status_changed` dengan reason `manual_revision`).
- Tambahkan banner "SPK dikembalikan untuk revisi oleh {actor}" jika `data.manual_revision_at` terisi.

### 6. Verifikasi

- Buat 1 SPK dummy, isi semua field engine/AC/suspension via canvas, buka `/spk/:id/print` → semua item terisi & berwarna.
- Approve dari akun customer → SPK status di dashboard admin berubah ke `qc_pending` dalam ≤1 detik.
- Test tombol "Minta Revisi ke Mekanik" dari staff → status kembali `in_progress`, tercatat di timeline.

---

## Detail teknis singkat

- Tidak ada perubahan schema DB (kecuali penambahan aksi di edge function `admin-user-ops` yang sudah ada).
- Tidak ada perubahan pada RPC customer (`customer_approve_spk` sudah benar).
- Semua penulisan data Canvas tetap pakai key aslinya — cukup **layer normalizer di sisi baca**, jadi tidak ada risiko migrasi data lama.
- File yang disentuh: `src/lib/spk/spkDisplayMap.ts` (baru), `src/pages/spk/SPKPrint.tsx`, `src/pages/spk/SPKCustomerApprove.tsx`, `src/pages/spk/SPKCanvas.tsx`, `supabase/functions/admin-user-ops/index.ts`.

Setuju lanjut implementasi?
