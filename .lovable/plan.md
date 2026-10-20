# SPK lebih berwarna + gambar Body Dent & Tyres Check

## 1. Isi ruang kosong di bawah Note by Mechanic (SPK Service)
- Tambah kartu **Body Dent Check** berisi gambar mobil dari foto Anda (samping kiri, depan, belakang, samping kanan).
- Tambah kartu **Tyres Check** seperti foto: kolom Left/Right, Front Tyre & Rear Tyre (mm), Brand, Pattern, Size, Ban Bekas (Bawa pulang / Ditinggal). Diisi dari data ban yang sudah ada.
- Gambar mobil dipotong dari foto unggahan dan disimpan sebagai gambar aplikasi.

## 2. Tema berwarna & informatif (SPK Service)
- Judul kartu diberi warna per bagian: Sales Advisor merah, Catatan Customer oranye, Tanggal & Waktu biru, Tyres/Body teal, Mekanik gelap, Part Replacement ungu, AI hijau.
- Tiap judul kartu diberi ikon kecil (oli, jam, ban, kunci, dll).
- Baris status di Diagnostic diberi warna latar lembut: hijau (Good), kuning (Attention), merah (Replace).
- Ringkasan kecil di atas Diagnostic: jumlah Good / Attention / Replace.
- Kotak waktu (Masuk/Keluar/Mulai/Selesai) diberi warna lembut; status CLOSED/OPEN berwarna.
- Sekalian rapikan tanggal mentah ("2026-10-19T09:28...") jadi "19 Okt 2026 09.28" dan durasi "NaNj NaNm" jadi lama pengerjaan atau "—".

## 3. SPK Ban ikut tema yang sama
- Kop STROBAN + garis merah + nomor SPK + status seperti SPK Service.
- Garis hitam tebal diganti kartu bergaris halus dengan judul berwarna (Form Pelanggan, Services, Kondisi Sebelum/Sesudah, Ketebalan Ban, History, Persetujuan).
- Centang aktif merah; kondisi ban berwarna (baik hijau, perlu perhatian kuning, ganti merah).
- Isi & susunan data SPK Ban tidak berubah.

## Detail teknis
- File: `src/pages/spk/SPKPrint.tsx` (kartu baru, palet per bagian, format waktu), `src/components/spk/ban/BanPrintSheet.tsx` (restyle).
- Palet & helper kartu dipindah ke `src/components/spk/print/printTheme.tsx` agar dipakai Service dan Ban.
- Gambar mobil: crop dari image-278.png via Python, unggah dengan lovable-assets.
- Warna tetap literal (dokumen kertas selalu terang, sama di PDF).
- Verifikasi Playwright: preview Service & Ban, lalu unduh PDF.
