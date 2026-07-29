## Tujuan
Menambahkan pilihan **📷 Scan SPK** dan **✍️ Isi Manual** saat tombol "Buat SPK Baru" ditekan. Scan memakai OCR AI untuk mengisi otomatis form intake, lalu user tetap bisa mengedit sebelum simpan. Flow SPK, workflow, database, dan fitur existing tidak diubah.

## Alur baru
```text
[Buat SPK Baru] ──> Dialog Pilihan
                     ├─ Isi Manual ─────────────> /spk/new (seperti sekarang)
                     └─ Scan SPK ──> Kamera/Galeri ──> OCR ──> Preview Card
                                                                └─> /spk/new (terisi otomatis)
```

## Yang dibangun

**1. Dialog pilihan (`SPKCreateModeDialog`)**
Dua kartu besar: Scan SPK dan Isi Manual. Dipakai di header All SPK (`src/pages/Admin.tsx`) dan FAB di `SPKAllList.tsx` — keduanya sekarang langsung `navigate("/spk/new")`, akan diganti membuka dialog ini.

**2. Ambil foto (`SPKScanDialog`)**
- Input file `accept="image/*"` + `capture="environment"` → langsung buka kamera di HP, dan opsi pilih dari galeri.
- Kompres/resize sisi terpanjang ke ~1600px di browser sebelum kirim (mempercepat OCR, target total < 30 detik).
- Tampilkan preview foto + tombol Ulangi / Proses OCR, dengan progress state.

**3. OCR di backend (edge function `spk-ocr-scan`)**
- Menerima gambar base64, memanggil Lovable AI Gateway (`openai/gpt-5.6-sol`, `reasoning_effort: "none"`) dengan structured output.
- Prompt berisi definisi seluruh field SPK kertas; model mengembalikan JSON: nilai + `confidence` (0–1) per field.
- Field yang tidak terbaca dikembalikan `null` — bukan error.
- Menangani error gateway: 429 (rate limit) dan 402 (kredit habis) ditampilkan sebagai pesan jelas di UI.

Field yang di-parse: plat, nama pelanggan, no HP, merk, tipe, tahun, KM, sales advisor, cabang, mekanik, keluhan, estimasi, oli (merek/qty), jasa, sparepart, checklist Engine, checklist Lampu, checklist AC, checklist Suspensi, catatan mekanik.

**4. Preview Card hasil OCR**
- Menampilkan semua field hasil baca, dikelompokkan (Pelanggan, Kendaraan, Servis, Checklist, Catatan).
- Setiap field **editable langsung** di preview.
- Field dengan confidence rendah (< 0.7) diberi highlight kuning + ikon peringatan "Periksa kembali".
- Field kosong dibiarkan kosong tanpa validasi error.
- Tombol: Batal / Gunakan Data Ini.

**5. Prefill ke form intake**
- Data hasil preview disimpan ke `sessionStorage` lalu `/spk/new?source=scan` membacanya saat mount dan mengisi `form`, `svcOilBrand`, `svcOilQty`, `svcOthers`, dll.
- Checklist & catatan mekanik disimpan sebagai bagian `data` SPK memakai key v2 yang sudah dipakai `spkDisplayMap.ts` (`chk_*_cond`, `lamps_flags`, `mechanic_note`) sehingga langsung tampil di Canvas dan PDF.
- Cabang hasil OCR dicocokkan ke daftar `branches` yang ada; jika tidak cocok, dibiarkan pilihan manual.
- Semua validasi Zod, signature, dan `SPKService.create()` tetap sama persis.

## Catatan teknis
- Tidak ada perubahan skema database, tabel, atau workflow. Foto hanya diproses sementara (tidak disimpan ke storage) kecuali diminta kemudian.
- Semua komponen baru mobile-first mengikuti primitives responsif SPK yang sudah ada (`spk-scope`, `SpkField`).
- File baru: `src/components/spk/create/SPKCreateModeDialog.tsx`, `SPKScanDialog.tsx`, `SPKScanPreview.tsx`, `src/lib/spk/ocrPrefill.ts`, `supabase/functions/spk-ocr-scan/index.ts`.
- File diubah: `src/pages/Admin.tsx`, `src/pages/spk/admin/SPKAllList.tsx`, `src/pages/spk/SPKNewForm.tsx` (hanya penambahan prefill).
