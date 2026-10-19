# Redesign SPK Service mengikuti file SPK_Stroban_1.html (design saja)

Scope: SPK Service only. Tidak mengubah data, alur, status, approval, atau SPK Ban.

## 1. Hasil SPK (pratinjau + PDF)
- Header: logo "Stroban" merah tebal + tagline, kanan: "SURAT PERINTAH KERJA", nomor SPK mono, tanggal, badge status (CLOSED merah / OPEN biru); garis bawah merah 3px.
- Kartu ringkas: head merah/gelap/abu kecil huruf kapital, isi padat abu muda, sudut 5px.
- Info pelanggan & kendaraan: baris label kecil kapital · titik-titik · nilai rata kanan, 2 kolom (1 kolom di HP).
- Strip kilometer dan strip waktu (Masuk/Mulai/Selesai/Durasi) berbingkai sel.
- Paket servis sebagai tombol kecil (aktif merah), daftar servis bercentang.
- Tabel diagnosa: judul grup abu, ikon status kecil (OK hijau, perlu perhatian kuning, ganti merah, N/A abu).
- Font Inter + JetBrains Mono untuk angka; ukuran 12.5px, jarak rapat 6px, lebar maks 860px.
- PDF unduhan mengikuti tampilan yang sama.

## 2. Inputan SPK Service (form Buat SPK + halaman pengerjaan)
- Kartu bagian memakai gaya head kapital kecil + isi padat yang sama.
- Label kecil kapital abu, input rapat, angka (KM, jam) font mono.
- Pilihan paket jadi tombol kecil merah saat aktif; checklist diagnosa memakai ikon status yang sama.
- Hanya tampilan; semua isian, validasi, auto-save tetap.

## Technical
- Tambah token SPK (warna dari html dipetakan ke CSS variable di index.css, mode gelap ikut).
- Edit komponen print sheet Service + generator PDF Service, kartu canvas Service dan `SPKNewForm` (cabang service). Komponen `ban/*` tidak disentuh.
- Verifikasi Playwright desktop + HP untuk pratinjau, form, dan PDF.
