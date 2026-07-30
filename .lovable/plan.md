## Tujuan
Membuat satu file PDF berisi rangkuman perubahan aplikasi hari ini, ditulis ringkas dalam Bahasa Indonesia, dilengkapi screenshot tampilan mobile untuk setiap perubahan.

## Cakupan perubahan yang dilaporkan (hari ini)
1. **Estimasi Sparepart di Card Booking** — tombol "Estimasi" pada setiap booking, dialog pengisian sparepart dengan UI identik Canvas SPK, sinkron dua arah dengan draft SPK, total card = harga servis + estimasi.
2. **Draft SPK otomatis** — booking tanpa SPK akan otomatis membuat draft SPK saat estimasi pertama disimpan.
3. **Sinkronisasi realtime** — perubahan estimasi dari Canvas SPK langsung memperbarui total di daftar booking tanpa refresh.
4. **Penugasan mekanik pada SPK** — input pilih mekanik di `/spk/new` dan blok edit mekanik di tahap finalisasi.
5. **Keterkaitan SPK ↔ akun pelanggan** — opsi buat akun + simpan data kendaraan, link aktivasi, dan tombol tautkan akun di kartu berbagi SPK.
6. **Scan SPK kertas** — tombol scan tersedia di semua tab pembuatan SPK, hasil OCR mengisi keluhan/servis/checklist tanpa menimpa data pelanggan terpilih.
7. **Lampiran foto SPK asli** dan **link/QR live tracking SPK publik** tanpa login.
8. **Perbaikan nama mekanik & cabang** di Dashboard SPK (tidak lagi menampilkan UUID).
9. **Banner beranda** — slider 5 gambar auto-slide + panel pengaturan di Dashboard → Marketing.
10. **Rename brand** menjadi "Bengkel Mobil Stroban" di seluruh UI, SEO, database branding, dan edge function.

Daftar final akan disesuaikan dengan riwayat perubahan yang benar-benar terjadi hari ini saat penyusunan.

## Cara pengambilan screenshot mobile
- Menjalankan Playwright headless pada preview lokal dengan viewport mobile (390×844, dpr 2).
- Login sesi admin yang tersedia di sandbox untuk mengakses halaman dashboard.
- Halaman yang di-capture: Beranda (banner slider), Dashboard Bookings (tombol & total estimasi), Dialog Estimasi, SPK Work Queue, `/spk/new` (pilih mekanik, scan, akun pelanggan), Canvas SPK, Kartu berbagi/QR SPK, Halaman live tracking publik, Dashboard SPK (nama mekanik/cabang), Dashboard Marketing → Banner.
- Bila sebuah halaman tidak dapat diakses (butuh data spesifik), akan dicatat di PDF dan diganti screenshot terdekat yang relevan.

## Format PDF
- Dibuat dengan Python ReportLab, font Unicode (DejaVu) agar teks Indonesia aman.
- Struktur: Sampul (judul, tanggal, logo/warna brand merah #ff2b2b) → Ringkasan Eksekutif (poin-poin singkat) → Per-perubahan: judul, penjelasan 2–3 kalimat "apa yang berubah & manfaatnya", screenshot mobile → Catatan penutup.
- Bahasa sederhana, non-teknis.

## Verifikasi
- Setiap halaman PDF dirender ke gambar dan diperiksa satu per satu (teks terpotong, gambar hilang, layout rusak) sebelum diserahkan.

## Output
`/mnt/documents/Laporan-Perubahan-Harian-Stroban.pdf`, ditampilkan sebagai artifact yang bisa diunduh.
