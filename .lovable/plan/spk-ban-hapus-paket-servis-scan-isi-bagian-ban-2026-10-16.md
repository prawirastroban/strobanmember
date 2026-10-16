# SPK Ban: hapus Paket & Servis, scan isi bagian ban

## Yang diubah
- **Form Buat SPK Ban**: bagian "Paket & Servis" disembunyikan, termasuk oli, servis umum, paket, AC, dan bonus. Isian "Dikerjakan Oleh (Mekanik)" dipindah ke bagian Data Ban supaya mekanik tetap bisa dipilih. SPK Service tidak berubah.
- **Scan khusus SPK Ban**: scan untuk jenis Ban memakai panduan baca formulir "Form Pelanggan Ban" (TOMO/Bridgestone). Hasilnya mengisi:
  - Data customer: Nama, No HP, No Plat, Merk/Tipe Mobil, Tahun, dan tanggal.
  - Data ban: Ukuran Ban, Merk Ban, Waktu Masuk/Mulai/Selesai/Jeda dan keterangannya.
  - Layanan yang dicentang: Spooring, Balancing, Nitrogen, Rotasi.
  - Kondisi Sebelum dan Sesudah: Tekanan (Baik/Kurang), Keausan (Baik/Tidak Rata), Velg/Baut (Normal/Bengkok).
  - Angka mm di tiap posisi ban, sebelum dan sesudah.
  - Jumlah Balancing dan Rotasi, Ban Bekas (Bawa/Tinggal), Catatan.
  - Riwayat: Merk/Tipe Lama dan Ukuran Lama.
  - Nama Admin dan Teknisi.
- **Pratinjau scan**: untuk SPK Ban, isian yang bisa dicek dan dikoreksi sebelum dipakai mengikuti kolom kertas Ban. Isian yang kurang yakin tetap diberi tanda peringatan.
- **Akurasi**: panduan baca berisi tata letak kertas, misalnya kolom kiri berisi data customer dan kolom kanan berisi data mobil/ban. Ada juga aturan tanda centang: lingkaran yang dicoret atau diisi berarti dipilih. Model baca dinaikkan ke tingkat penalaran sedang untuk tulisan tangan.

## Detail teknis
- `SPKNewForm.tsx`: tampilkan SectionCard Paket & Servis hanya untuk `spkType !== "ban"`. Untuk Ban, render pemilih mekanik di dalam blok Ban.
- `SPKScanDialog.tsx`: kirim `spk_type` ke edge function. Setelah hasil masuk, bangun prefill Ban.
- `spk-ocr-scan`: tambah prompt dan skema JSON `ban` jika `spk_type === "ban"`. Prompt berisi field, enum kondisi, posisi fl/fr/rl/rr untuk sebelum dan sesudah, serta services. Field tidak dikenal dibuang. Pakai `reasoning_effort: "medium"`.
- `ocrPrefill.ts`: `OCR_FIELD_DEFS_BAN` untuk preview. `buildBanPrefill` dipetakan ke `BanData` melalui `normalizeBanData` dan disimpan sebagai `extraData.ban`. `SPKNewForm` mengisi `banData` dari prefill.
