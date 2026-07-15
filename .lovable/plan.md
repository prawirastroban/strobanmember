## Tujuan

Perbaiki flow SPK agar tidak berhenti di **Final Check Mekanik**, ubah urutan phase menjadi 4 langkah operasional yang diminta, perkaya **Riwayat Timeline** dengan label + timestamp yang informatif, dan pastikan data yang sudah diinput tidak hilang saat kembali.

## Flow SPK Baru (5 status DB, 4 phase user)

```
draft ─▶ awaiting_customer_approval ─▶ in_progress ─▶ qc_pending ─▶ closed
        (Admin isi + TTD Customer)   (Mekanik cek + TTD Mekanik)  (Final QC Mekanik)   (Selesai)
```

- **Draft** – Admin/SA mengisi header, keluhan, data kendaraan.
- **Awaiting Customer Approval** – customer/staff-bypass TTD di device.
- **In Progress (Pengerjaan Mekanik)** – mekanik mengisi inspection & TTD mekanik.
- **QC Pending (Final Check Mekanik)** – mekanik final check + centang approval.
- **Closed (Selesai)** – SPK ditutup, PDF final tersedia.

## Perubahan

### 1. Database — transisi workflow baru (migration)
- Sisipkan `awaiting_customer_approval → in_progress` untuk `admin`, `admin_cabang`, `mechanic`, `system`, `owner`.
- Sisipkan `in_progress → qc_pending` untuk `mechanic`, `admin`, `admin_cabang`, `owner`.
- Sisipkan `in_progress → awaiting_customer_approval` (revisi balik) untuk `admin`, `admin_cabang`, `owner`.
- Biarkan transisi lama tetap ada untuk backward compatibility (SPK yang sudah di `qc_pending` tetap bisa closed).

### 2. Frontend — `src/pages/spk/SPKCanvas.tsx`
- Perbarui `WORKFLOW_PHASES` menjadi 5 phase: **Draft → Persetujuan Customer → Pengerjaan Mekanik → Final Check Mekanik → Selesai** dan mapping status yang benar (`in_progress` = Pengerjaan Mekanik).
- Perjelas label tombol saat status `qc_pending` → tetap muncul CTA "Selesaikan & Tutup SPK" walaupun approval matrix `final_approval` off (fix stuck di final check). Tambahkan fallback: jika role mekanik dan tidak ada transisi tersedia, tampilkan pesan yang jelas.

### 3. Frontend — `src/hooks/spk/useSPKWorkflow.ts`
- `filterByApproval` **tidak** menyembunyikan `closed` — flag `final_approval` hanya mengatur `invoice_issued/invoice_paid`. Ini mencegah SPK terkunci di `qc_pending`.
- `ACTION_META.in_progress.label` → "Kirim ke Mekanik untuk Pengerjaan".
- `ACTION_META.qc_pending.label` → "Kirim ke Final Check Mekanik".
- `ACTION_META.closed.label` → "Selesaikan SPK".

### 4. Timeline — `src/lib/spk/eventLabels.ts` + `src/pages/spk/SPKPrint.tsx` + `src/components/spk/OperationalTimeline.tsx`
- Tambahkan helper `describeStatusTransition(from, to)` → "Persetujuan Customer → Pengerjaan Mekanik".
- Di `eventToStage` gunakan deskripsi transisi untuk `status_changed` sehingga label tidak lagi "status_changed" mentah.
- `SPKPrint` timeline: pakai `t.title ?? stageLabel(eventToStage(t))` dan tampilkan waktu (`toLocaleString id-ID`).
- `OperationalTimeline`: tambahkan durasi antar-event (mis. "· 12 menit setelah Draft") dan tanggal formatted.

### 5. Persistensi data — `src/hooks/spk/useSPKAutosave.ts`
- Turunkan debounce ke 500ms.
- Tambah flush pada `beforeunload` / `visibilitychange=hidden` menggunakan `navigator.sendBeacon` fallback ke fetch synchronous. Ini mencegah data hilang saat user swipe back di mobile sebelum debounce sempat commit.
- Log status ke `RuntimeBus` supaya chip "Tersimpan" tetap sinkron.

## Ringkasan file yang akan diedit
1. `supabase/migrations/*` (baru) — insert transisi workflow.
2. `src/pages/spk/SPKCanvas.tsx` — WORKFLOW_PHASES + label CTA.
3. `src/hooks/spk/useSPKWorkflow.ts` — filter + label.
4. `src/hooks/spk/useSPKAutosave.ts` — debounce & flush.
5. `src/lib/spk/eventLabels.ts` — describeStatusTransition.
6. `src/pages/spk/SPKPrint.tsx` — timeline render.
7. `src/components/spk/OperationalTimeline.tsx` — durasi + label baru.

## Yang **tidak** diubah
- Skema `spk_orders` / kolom baru — cukup transisi.
- UI section 1–11 (form) — tetap.
- Approval matrix panel (owner tetap bisa toggle).

Setelah plan disetujui, saya jalankan migration dulu (butuh review), lalu edit file frontend secara paralel.