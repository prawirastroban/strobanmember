# Setelan Thumbnail Katalog Layanan

## Masalah
Kartu katalog memakai gambar/slideshow yang sama dengan tampilan detail. Karena rasio media aslinya lebar, gambar terpotong dan objek (mobil) tidak pas di kotak thumbnail kiri kartu.

## Yang dibuat
Setelan **Thumbnail Katalog** terpisah di form Tambah/Edit Service (Dashboard → Marketing → Layanan):

1. **Gambar Thumbnail** (opsional) — upload/URL khusus untuk kartu katalog. Kalau kosong, tetap pakai media/slideshow yang sekarang.
2. **Mode Tampilan (object-fit)** — Cover (penuh, boleh terpotong) / Contain (seluruh gambar tampil, ada ruang kosong) / Fill.
3. **Posisi Fokus (object-position)** — Tengah, Atas, Bawah, Kiri, Kanan (agar objek tidak kepotong).
4. **Zoom / Skala** — slider 80%–160% untuk memperbesar-kecilkan isi thumbnail.
5. **Rasio Kotak Thumbnail** — 1:1 (persegi), 4:3, atau 3:4 untuk kartu daftar katalog.
6. **Warna Latar Thumbnail** — dipakai saat mode Contain (default warna brand merah seperti sekarang).
7. **Live preview** kecil di form yang menampilkan hasil persis seperti di kartu katalog.

Panduan format ditampilkan langsung di setelan:
- Ukuran disarankan **600 × 600 px** (rasio 1:1), minimal 300 × 300 px
- Format **JPG / PNG / WebP**, maksimal **2 MB**
- Objek utama di tengah, beri ruang kosong ±10% di tepi

## Perilaku di halaman katalog
- Kartu daftar (belum diklik) → memakai gambar + setelan thumbnail.
- Saat kartu diklik → bottom sheet detail tetap menampilkan slideshow media penuh seperti sekarang (tidak berubah).
- Layanan lama tanpa setelan thumbnail → tampilan tetap sama seperti sekarang.

## Catatan Teknis
- Migrasi: tambah kolom pada `public.services` — `thumbnail_url text`, `thumbnail_fit text default 'cover'`, `thumbnail_position text default 'center'`, `thumbnail_zoom numeric default 1`, `thumbnail_ratio text default '1:1'`, `thumbnail_bg text` (semua nullable/berdefault, tanpa GRANT baru karena tabel sudah ada).
- `ServiceManager.tsx`: panel "Thumbnail Katalog" (upload ke bucket `service-images` prefix `thumbs/`, validasi ≤2MB) + preview.
- `Katalog.tsx`: blok media kartu memakai `thumbnail_url` bila ada, dengan class/style dari setelan; fallback ke `ServiceMediaSlideshow` seperti sekarang.
- Warna memakai token semantik, tanpa hex hardcoded.
