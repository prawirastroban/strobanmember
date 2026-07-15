## Tujuan

Pindahkan **Signature Admin/Sales Advisor** dan **Signature Customer** dari Section 11 (Approval) ke bagian input awal admin (Section 1–4). Section 11 hanya menyisakan **Final Check + TTD Mekanik**.

Alasan: TTD Admin & Customer secara operasional dibuat pada tahap awal (saat admin mencatat keluhan dan service order, dan customer menyetujui order sebelum dikerjakan). TTD Mekanik tetap di akhir karena ia final check.

## Penempatan baru

Tambahkan sub-card "Persetujuan Awal" **di dalam Section 4 — Service Order** (`ServiceOrderCard.tsx`), tepat setelah daftar order. Ini paling natural: admin selesai catat keluhan + order → keduanya tanda tangan sebelum mekanik mulai.

Struktur baru Section 4:
```
Service Order (existing fields)
—
Persetujuan Awal
  [ Signature Admin / Sales Advisor ]   [ Signature Customer ]
```

Section 11 setelah perubahan:
```
Approval & Signature (Mekanik)
  Final Check checklist
  [ Signature Mekanik — Final Check ]
```

## Perubahan file

1. **`src/components/spk/canvas/ServiceOrderCard.tsx`**
   - Import `SignaturePadBound`.
   - Setelah blok field service order, render blok baru:
     - Header kecil "Persetujuan Awal" (style konsisten dengan blok "Final Check" di ApprovalCard).
     - Grid 1 kolom di mobile, 2 kolom di sm: `SignaturePadBound code="signature_admin"` dan `SignaturePadBound code="signature_customer"`.
   - Kode field tetap sama (`signature_admin`, `signature_customer`) → data persist di kolom yang sama, tidak perlu migrasi DB, tidak memutus alur customer approval (RPC `customer_approve_spk` tetap menulis `signature_customer`).

2. **`src/components/spk/canvas/ApprovalCard.tsx`**
   - Hapus dua `SignaturePadBound` untuk `signature_admin` dan `signature_customer`.
   - Ubah grid signature dari 3 kolom → 1 kolom (hanya `signature_mekanik`).
   - Judul section tetap "Approval & Signature"; role tetap `mechanic`.
   - Final Check checklist tetap.

## Yang **tidak** berubah

- Field code (`signature_admin`, `signature_customer`, `signature_mekanik`) → tidak ada migrasi.
- Alur customer approval jarak jauh (`/spk/:id/approve`) → tetap menulis ke `signature_customer`, otomatis muncul di Section 4 saat admin buka SPK.
- `SPKPrint.tsx` (PDF) → tetap membaca ketiga field yang sama; tidak perlu diubah.
- Workflow, autosave, role profiles → tidak tersentuh.
- RuntimeBus, ApprovalMatrix panel → tidak tersentuh.

## Verifikasi setelah build

- Buka SPK existing → Section 4 menampilkan dua pad TTD (Admin, Customer); Section 11 hanya pad Mekanik.
- Tanda tangan di Section 4 tersimpan (chip "Tersimpan" muncul, refresh tetap ada).
- PDF cetak menampilkan ketiga tanda tangan seperti sebelumnya.
- Customer approve dari halaman `/spk/:id/approve` → signature muncul di Section 4 admin.
