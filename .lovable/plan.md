
# Phase 5.3 (Revised) — Digital SPK Canvas (Design Only)

## Prinsip
Paper SPK Stroban = **single source of truth struktur informasi**. Digital SPK harus 1:1 secara informasi & urutan, hanya interaksi dan tata letak yang dimodernkan untuk mobile. Design only — nol perubahan DB / Runtime / Services / Workflow / Analytics / Builder / OCL / Booking / Edge Functions.

## Files
**Create**
- `src/pages/spk/SPKCanvas.tsx` — halaman "Digital SPK Canvas"
- `src/components/spk/canvas/CanvasHeader.tsx` — Service Report Header (brand "STROBAN · First Class Service", nomor SPK, tanggal, cabang)
- `src/components/spk/canvas/CustomerCard.tsx` — Nama Cust, No HP, Platform (Iklan/Sosmed · Organik)
- `src/components/spk/canvas/VehicleCard.tsx` — Merk / Tipe / Tahun / No. Pol. / Mileage Now / Mileage Next
- `src/components/spk/canvas/ComplaintCard.tsx` — Catatan Customer + Waktu Estimasi + Waktu Konfirmasi
- `src/components/spk/canvas/ServiceOrderCard.tsx` — Merk/Jenis Oli · Service Umum (Ganti Oli + liter, Tune Up M/P/U, Kaki-kaki, Spooring, Balancing, Oil Filter, Cuci Darah, Service AC, Brake Service, Safety Check) · Others Service · Service Packages Petrol (Bronze/Silver/Gold/Diamond/Promo Khusus) · Diesel (Endurance/Full Pow) · AC Package (Polar/Orca/Small/Medium/Large) · Bonus
- `src/components/spk/canvas/InspectionEngineCard.tsx` — Engine / Brake System / Fluid Check (14 baris paper: Engine Oil, Brake Fluid, Spark Plug, Packing Seal, Power Steering Fluid, Coolant, Transmission Fluid, Matic Transmision, Differential Gear Oil, Brake Pad Front, Brake Pad Rear, V-Belt, Brake Cylinder, Brake Calipers) + Service Lainnya + Lamps (Head/Fog/Side/Rear/Brake) + Wiper Blades/Fluid/Battery/Alternator
- `src/components/spk/canvas/InspectionSuspensionCard.tsx` — Wheel Bearing / Control Arm / Ball Joint / Shock Absorber + Part Replacement
- `src/components/spk/canvas/ACCheckCard.tsx` — 12 item AC (Compressor, Magnetic Clutch, Condensor, Pipe, Switch, Compressor Oil, Evaporator, Motor Fan, Blower, Automatic, Cabin Air Filter, High Pressure, Low Pressure) + Other Remarks
- `src/components/spk/canvas/TyreCheckCard.tsx` — diagram mobil top-down, 4 roda tappable (kedalaman mm + SC toggle) + Brand / Pattern / Size + Ban Bekas (Bawa pulang · Ditinggal)
- `src/components/spk/canvas/MechanicNotesCard.tsx` — Note by Mechanic + Catatan Jeda
- `src/components/spk/canvas/TimeTrackingCard.tsx` — Tanggal Masuk / Tanggal Keluar / Waktu Masuk / Waktu Keluar / Waktu Mulai / Waktu Selesai / Waktu Jeda / Waktu Mulai Kembali (read-only, placeholder statis; siap dibaca dari timeline events di phase wiring)
- `src/components/spk/canvas/ApprovalCard.tsx` — Final Check ("Sudah Dikerjakan Sesuai Order", "Mobil Dalam Kondisi Bersih") + 3 signature pads (Technician, Sales Advisor, Customer) + legend "Perhatian Warna Tugas" (Diisi SA · Diisi Mekanik)
- `src/components/spk/canvas/OkNotToggle.tsx` — segmented OK / NOT OK / N/A + optional SC chip
- `src/components/spk/canvas/SignaturePad.tsx` — HTML `<canvas>` touch+mouse, tombol Hapus

**Modify**
- `src/pages/spk/SPKDetail.tsx` → re-export / render `<SPKCanvas />` supaya route `/spk/:id` tetap valid. Tidak menambah route baru, tidak menyentuh `App.tsx`.

## Urutan Halaman (mirror paper, urutan wajib per brief)
```text
[Sticky Top Bar] — back · SPK Number · status pill
1.  Service Report Header
2.  Customer Information
3.  Vehicle Information
4.  Customer Complaint
5.  Service Order
6.  Inspection Checklist   (parent group, section 6a Suspension inside)
7.  Tyre Check
8.  AC Check
9.  Engine / Brake / Fluid Check
10. Mechanic Notes
11. Time Tracking Summary
12. Approval & Signature
[Sticky Action Bar] — Simpan · Pause · Selesaikan
```
Catatan: brief menempatkan Tyre & AC sebelum Engine/Brake/Fluid — order diikuti persis. Isi & label per baris tetap mengikuti paper SPK.

## Mapping Interaksi (paper → mobile)
- Ok/Not per baris → `OkNotToggle` segmented (OK · NOT OK · N/A), tap target ≥ 44px, warna semantic (emerald/red/muted).
- Kolom `SC` → chip toggle kecil di samping OkNotToggle.
- Lamps (Head / Fog / Side / Rear / Brake) → 5 chip toggle sejajar dalam satu row.
- Tyre → SVG mobil top-down; tap roda buka inline expander (bukan modal) berisi kedalaman mm + OK/NOT + catatan singkat. Brand / Pattern / Size sebagai grid input. Ban Bekas → segmented "Bawa pulang · Ditinggal".
- Service Umum & Packages → row checkbox besar; Ganti Oli menyimpan angka liter di inline input.
- Tune Up M/P/U → 3 chip toggle.
- Platform (Iklan/Sosmed · Organik) → segmented 2-option.
- Time Tracking → read-only card (tanpa input), placeholder statis. Bindings runtime menyusul.
- Signature → 3 `<canvas>` pad, tombol Hapus per pad; state lokal `useState`, belum commit.
- Legend "Diisi SA / Diisi Mekanik" → warna border/label lembut per section (visual only, tanpa RBAC gating di UI ini).

## Design System
- Semantic tokens only (`bg-card`, `text-foreground`, `border-border`, primary `#ff2b2b`).
- Mobile-first, `max-w-2xl` container, satu dokumen scrollable (no wizard, no multi-page, no popup).
- Setiap section = `Card` dengan sticky mini-label kiri (nomor section) supaya struktur paper terasa.
- Sticky top bar (glass) + sticky bottom action bar dengan safe-area inset.
- Ikon `lucide-react`.

## Placeholder Data
- Import type-only `SpkOrderRow` dari `src/services/spk/types.ts` sebagai referensi.
- Semua nilai statis di file; OK/NOT & signature disimpan di `useState` lokal.
- Tidak ada query Supabase, tidak ada call service/runtime.

## Yang TIDAK Dilakukan
- Tidak menambah/mengubah migration, RLS, edge function, service, hook, runtime.
- Tidak menyentuh `SPKWorkQueue.tsx`, `App.tsx`, Booking Online, invoice, PDF export.
- Tidak mengubah label bisnis / urutan informasi paper (hanya layout & interaksi).
- Tidak menambah role gating (visual hint saja).

## Validasi
- `bunx tsgo --noEmit` bersih.
- Route `/spk/:id` tetap render tanpa runtime error.
- Semua field paper SPK hadir dan terurut sesuai brief.
- Semua kontrol OK/NOT & checkbox ≥ 44px, signature pad bisa digambar dengan jari.
- Tidak ada import dari `src/services/spk/*` atau `src/runtime/spk/*` (design-only).

## Pertanyaan Terbuka (tidak memblokir)
1. Signature: simpan sebagai base64 PNG di state (siap diwire ke `spk_orders.data.signatures` nanti) — konfirmasi.
2. Time Tracking Phase 5.3 pakai placeholder statis (default plan) atau mulai read-only dari timeline events?
3. Diagram mobil untuk Tyre: SVG inline generik (default) atau butuh ilustrasi Stroban khusus?
