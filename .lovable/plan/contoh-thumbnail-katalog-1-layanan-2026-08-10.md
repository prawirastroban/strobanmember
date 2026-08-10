# Contoh Thumbnail Katalog (1 Layanan)

## Kondisi saat ini
Dari data layanan aktif: hanya **Paket Servis Diamond** yang punya `thumbnail_url`. Layanan lain (termasuk **Paket Servis Bronze**) masih kosong, jadi kartunya memakai slideshow media dan gambar terlihat terpotong.

## Yang akan dibuat
Satu contoh thumbnail yang "pas" untuk **Paket Servis Bronze** sebagai acuan visual:

1. Buat gambar thumbnail 600 × 600 px (rasio 1:1) — foto mobil di bengkel dengan objek di tengah dan ruang kosong ±10% di tepi, nuansa gelap dengan aksen merah brand.
2. Unggah gambar ke penyimpanan katalog (bucket `service-images`, prefix `thumbs/`).
3. Set setelan thumbnail untuk layanan tersebut:
   - Mode tampilan: Cover
   - Posisi fokus: Tengah
   - Zoom: 1.0
   - Rasio: 1:1
   - Warna latar: default
4. Cek hasilnya di `/katalog` (screenshot kartu Paket Servis Bronze) untuk memastikan gambar tidak terpotong dan proporsional dibanding kartu lain.

## Catatan Teknis
- Gambar dibuat ke `src/assets/`, lalu diunggah lewat storage upload ke `service-images/thumbs/`.
- Update baris `services` untuk Paket Servis Bronze (`70835bdc-…`) pada kolom `thumbnail_url`, `thumbnail_fit`, `thumbnail_position`, `thumbnail_zoom`, `thumbnail_ratio`.
- Tidak ada perubahan komponen/kode; hanya data + aset.
