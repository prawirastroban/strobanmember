## Tujuan

Menambahkan lampiran **foto SPK asli (formulir kertas)** pada SPK digital, agar setiap SPK punya bukti visual dokumen fisiknya.

## Kondisi saat ini (terverifikasi)

- `PhotoDropzone.tsx` masih **stub UI** — tombol "Tambah" hanya menambah kotak kosong, tidak ada input file maupun upload.
- Belum ada bucket storage untuk SPK (bucket yang ada: avatars, tire-images, vehicle-images, service-images, service-icons, branding, payment-assets, withdrawal-proofs, pickup-handover, popup-images, payment-proofs, internal-reports).
- Fitur **Scan SPK** sudah mengambil foto formulir kertas dan mengompres ke JPEG, tapi foto itu hanya dipakai untuk OCR lalu dibuang (tidak disimpan).

## Rencana

### 1. Storage
- Buat bucket **publik** `spk-photos` (publik agar link share / QR tracker & PDF bisa dibuka konsumen tanpa login, sama seperti `vehicle-images`).
- Policy `storage.objects`: upload/update/hapus hanya untuk user internal (admin, admin_cabang, staff, mekanik); baca publik.
- Struktur path: `spk/<spk_id>/<timestamp>-<nama>.jpg`.

### 2. Komponen upload nyata
- Ubah `PhotoDropzone.tsx` menjadi komponen upload sungguhan (controlled): `value: SpkPhoto[]`, `onChange`, opsi kamera (`capture="environment"`) dan galeri, kompres sisi terpanjang 1600px / JPEG q0.8 (pakai helper yang sama seperti Scan SPK), progress, hapus foto, preview klik untuk perbesar.
- Bentuk data disimpan: `{ url, path, uploaded_at, uploaded_by_name }`.

### 3. Titik pemakaian
- **`/spk/new` (intake)**: section baru **"Foto SPK Asli"** (maks 6 foto). Karena `spk_id` belum ada saat upload, foto diunggah ke folder sementara lalu direferensikan pada `data.original_spk_photos` ketika SPK dibuat.
- **Scan SPK**: foto yang dipakai OCR otomatis ikut terlampir sebagai foto SPK asli (tanpa upload ulang).
- **SPK Canvas (mekanik/admin)**: kartu "Foto SPK Asli" untuk melihat dan menambah foto susulan; disimpan lewat autosave.
- Dropzone untuk keluhan & temuan mekanik yang sekarang masih stub ikut memakai komponen baru agar konsisten (key terpisah: `complaint_photos`, `mechanic_photos`).

### 4. Tampil di output
- **PDF / `SPKPrint.tsx`**: blok "Lampiran Foto SPK Asli" berupa grid thumbnail, ditandai `data-pdf-block` agar tidak terpotong halaman.
- **Public tracker `/spk/:id/track`**: galeri foto read-only (bucket publik, tanpa login).
- **`spkDisplayMap.ts`**: tambah field `photos` supaya semua permukaan tampilan memakai satu sumber data.

### 5. Keamanan data
- Tambah key `original_spk_photos`, `complaint_photos`, `mechanic_photos` ke `PROTECTED_KEYS` pada `useSPKAutosave.ts` agar tidak tertimpa saat autosave berbarengan.
- Validasi client: hanya `image/*`, maks 6–8 file, maks ~8MB per file sebelum kompresi.

## Catatan teknis

Tanpa perubahan pada workflow, status, approval, atau tabel baru — seluruh data lampiran disimpan di kolom `data` (JSONB) milik `spk_orders`, hanya bucket storage + policy yang ditambahkan.
