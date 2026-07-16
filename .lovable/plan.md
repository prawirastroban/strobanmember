
## Konteks

Mockup HTML yang Anda export berisi 3 tab utama untuk pengerjaan mekanik:
1. **Safety Check** — Tyre Check (diagram FL/FR/RL/RR + brand/pattern/size + kedalaman + kondisi per posisi) + Engine/Brake/Fluid checklist + Other Components (Lamps, Wiper, Battery)
2. **General Check Up** — Extended engine check + Air Conditioning System
3. **Estimasi** — Tabel sparepart (Nama, Qty, Harga, Urgensi OK/BAD, Persetujuan ✓/✗) + Summary (Sub Total, Diskon Jasa, Diskon Sparepart, Total Payments)

Flow baru yang Anda tetapkan: **Buat SPK (admin+customer sign di `/spk/new`) → langsung Pengerjaan Mekanik → Selesai** (tanpa Final QC, tanpa approval customer kedua).

## Perubahan Flow (Workflow)

File: `src/services/workflow/*`, `useSPKWorkflow`, `WorkflowEngine` config
- Hapus state `awaiting_customer_approval` kedua dan `final_check_mechanic` dari transisi runtime.
- Transisi baru: `in_progress` → `completed` (mekanik langsung tekan "Selesai" setelah semua section acknowledged).
- Timeline label tetap descriptive ("Mekanik menyelesaikan pengerjaan").
- Update `RoleProfiles` seed di `spk.role_profiles` (app_settings) — section yang editable oleh `mekanik` = semua 3 tab baru.

## Redesign SPK Canvas Mekanik

Ganti struktur section 5–10 lama (yang panjang & vertikal) dengan **tab layout** sesuai mockup. Section 1–4 (data customer/kendaraan/keluhan/paket + signature) tetap berasal dari `/spk/new` dan ditampilkan **read-only ringkas** di atas tab.

### File Baru
- `src/components/spk/canvas/v2/MechanicTabs.tsx` — container 3 tab (Safety / General / Estimasi) dengan style pill merah aktif dari mockup.
- `src/components/spk/canvas/v2/TyreCheckPanel.tsx` — diagram 4-posisi ban (FL/FR/RL/RR), form Brand/Pattern/Size, toggle "Ban Bekas: Bawa pulang / Ditinggal", per-posisi Kedalaman (mm) + kondisi GOOD/OK/BAD + note.
- `src/components/spk/canvas/v2/ConditionRow.tsx` — reusable row: label + GOOD/OK/BAD toggle + note. Menggantikan `OkNotToggle` untuk tab checklist.
- `src/components/spk/canvas/v2/ChecklistGroup.tsx` — grup checklist (Engine/Brake/Fluid, Other Components, AC) dengan header merah + alternating row background merah muda (`bg-brandRedLight`).
- `src/components/spk/canvas/v2/LampsRow.tsx` — row khusus dengan sub-tombol HEAD/FOG/TURN/REVERSE/REAR/BRAKE + kondisi.
- `src/components/spk/canvas/v2/EstimasiTable.tsx` — tabel dinamis Nama/Qty/Harga/Urgensi(OK/BAD)/Persetujuan(✓/✗), tombol "Tambah Item", ringkasan Subtotal/Diskon Jasa/Diskon Sparepart/Total Payments (format Rupiah `id-ID`).
- `src/components/spk/canvas/v2/EstimasiRow.tsx` — 1 baris item.

### Field Runtime (SPK data JSON)
Ekstensi `spk.form_data` (JSONB) dengan namespace baru agar tidak konflik data lama:
- `tyre_check`: `{ brand, pattern, size, banBekas: 'bawa'|'tinggal', positions: { FL|FR|RL|RR: { depthMm, condition: 'good'|'ok'|'bad', note } } }`
- `safety_engine`: `{ [item]: { condition, note } }` untuk Engine Oil, Brake Fluid, Packing Seal, Brake pad Front/Rear, V-Belt.
- `safety_other`: idem untuk Wiper Blades, Wiper Fluid, Battery + `lamps: { head, fog, turn, reverse, rear, brake: bool, condition, note }`.
- `general_engine_ext`: Spark Plug, Power Steering Fluid, Coolant, Transmission Fluid, dll.
- `general_ac`: Compressor, Magnetic Clutch, Condensor, Pipe, Switch.
- `estimasi`: `{ items: [{ id, nama, qty, harga, urgensi, approval }], diskonJasa, diskonSparepart }`.

`useBinding` sudah generik — cukup arahkan ke path baru; tidak perlu ubah `FormRuntimeProvider`.

### Style Tokens
Tambah ke `tailwind.config.ts`:
```
brandRed: '#ff0000', brandRedDark: '#cc0000', brandRedLight: '#ffe6e6',
condGood: '#00ff00', condOk: '#ffcc00', condBad: '#b34700'
```
Semua warna dipakai via class Tailwind, tidak inline hex.

### Integrasi ke `SPKCanvas.tsx`
- Section 1–4 (Customer, Kendaraan, Keluhan, Paket & Signature) → render ringkas sebagai **read-only summary card** di atas (data sudah difinalisasi di `/spk/new`).
- Section pengerjaan lama (5–10) → diganti komponen `<MechanicTabs>`.
- Section 11 (signature mekanik akhir) → tetap, muncul di bawah tab Estimasi, dengan tombol "Selesaikan SPK" yang panggil `runtime.validateAll()` + workflow transition `in_progress → completed`.
- Progress header `SPKUXProvider` tetap dipakai: tiap tab dihitung completion-nya (Safety = semua kondisi terisi, Estimasi = min 0 item OK).

## Halaman Terkait (Konsistensi)

- `SPKPrint.tsx` (PDF) — Tambah section Tyre Check + Estimasi Sparepart di PDF template, tanpa mengubah section 1–4 yang sudah bersih.
- `SPKAllList.tsx` card — tambah badge "Estimasi Rp X" bila ada item disetujui.
- `SPKDetail.tsx` (read-only history) — render dengan komponen tab yang sama tapi `readOnly=true` sehingga history & download PDF konsisten.

## Yang Tidak Diubah

- Section 1–4 di `/spk/new` (Customer/Vehicle/Complaint/Package + Signature Admin & Customer) — sudah final.
- `SPKService`, RLS, RPC signature, RuntimeBus, AutomationEngine — tetap.
- Notifikasi in-app customer ping — sudah tidak diperlukan di flow baru; tombol Navbar customer approval tetap ada untuk SPK lama yang masih di state legacy (backward compatible), tapi SPK baru langsung skip state itu.

## Migrasi Data Lama

- SPK dengan `form_data` skema lama tetap dapat dibuka di `SPKDetail` (fallback renderer lama untuk data tanpa namespace `tyre_check`/`safety_engine`).
- Tidak ada migrasi destructive di DB — hanya penambahan path baru di JSONB.

## Urutan Implementasi

1. Tambah tokens Tailwind + komponen primitif (`ConditionRow`, `ChecklistGroup`, `EstimasiRow`).
2. Bangun 3 panel tab (`TyreCheckPanel`, checklist groups, `EstimasiTable`) + container `MechanicTabs`.
3. Rewire `SPKCanvas.tsx`: summary section 1–4 read-only + `MechanicTabs` + signature mekanik + tombol Selesaikan.
4. Update workflow: hapus state QC/second-approval, transisi langsung ke `completed`.
5. Update `SPKPrint.tsx` template PDF + `SPKAllList` badge.
6. QA: buat SPK baru → buka canvas mekanik → isi 3 tab → Selesaikan → cek PDF.
