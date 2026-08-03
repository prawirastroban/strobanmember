## Ringkasan
Menerapkan 7 anotasi pada gambar 2 (Homepage) dengan gaya visual gambar 1 (kartu putih, aksen merah Stroban, ikon bulat bernomor). Tidak ada perubahan flow booking, database logic, atau backend — hanya lapisan tampilan + 1 penyimpanan lokal form.

## 1. Menu Keranjang di header
- Tambah ikon keranjang di header mobile (`src/components/Navbar.tsx`), di sebelah lonceng notifikasi.
- Menampilkan badge jumlah item dari `CartContext` (sudah ada), klik → `/booking?cart=1` (rute sama dengan pill sekarang, flow tidak berubah).

## 2. Searchbar keluhan di atas
- Menaikkan input keluhan ke posisi paling atas hero sebagai search bar bergaya gambar 1: kartu putih membulat, placeholder "Apa masalah mobil anda ?", tombol panah merah di kanan.
- File: `src/components/mobile/home/HeroBookingForm.tsx` (varian `hero`). Aksi tombol tetap seperti sekarang.

## 3. "Ban" → "Ganti Ban"
- Label kategori berasal dari tabel kategori layanan. Ubah label kategori `tires` menjadi "Ganti Ban" di data kategori, plus pemetaan label pada `SERVICE_CATEGORY_LABEL` di `HeroBookingForm.tsx` agar konsisten. Slug/kategori tidak diubah, jadi deep-link katalog tetap jalan.

## 4. Data kendaraan pada form keluhan tidak reset
- Simpan field tamu (merk, tipe, tahun, transmisi, kilometer, plat) ke `localStorage` dan pulihkan saat halaman dibuka kembali.
- Hanya penyimpanan tampilan-form; pengiriman booking tidak berubah.

## 5. Blok "Who We Are" + "Why Choose Us"
- Perluas `TrustStrip.tsx`: tambahkan paragraf singkat pengenalan Bengkel Mobil Stroban, lalu 4 kartu keunggulan sesuai catatan gambar 2:
  - 100% Guarantee Original Product
  - Bergaransi
  - Pelayanan Terbaik
  - After Care
- Gaya kartu putih 2 kolom dengan judul merah seperti panel "Kenapa pilih Stroban?" pada gambar 1.

## 6. Navigasi/tutorial penggunaan aplikasi
- Komponen baru `src/components/mobile/home/HowToBook.tsx`: 6 langkah bernomor (buka aplikasi → pilih layanan → pilih tanggal & waktu → isi data diri & kendaraan → konfirmasi booking → terima konfirmasi) dengan timeline bulatan merah persis gaya gambar 1.
- Dipasang di `src/pages/Index.tsx` pada blok mobile, setelah blok Why Choose Us.

## 7. Pill keranjang → pop-up floating Status Pengerjaan
- `src/components/FloatingCartPill.tsx` diubah menjadi notifikasi floating merah yang menampilkan status pengerjaan servis aktif dan mengarah ke halaman Tracking Service saat ditekan; tetap bisa ditutup.
- Fungsi keranjang tetap tersedia lewat ikon keranjang baru di header (poin 1), sehingga tidak ada fungsi yang hilang.

## Urutan tampilan mobile setelah perubahan
Banner → Search keluhan → Layanan (Ganti Ban) → Form keluhan/booking → Voucher → Who We Are + Why Choose Us → Cara Booking (6 langkah) → Ulasan Pelanggan

## Catatan teknis
- Semua warna memakai token desain yang ada (primary merah), tanpa warna hardcode.
- Tidak ada perubahan skema database, edge function, atau alur booking/SPK.
- Setelah implementasi: typecheck + verifikasi tampilan mobile 393px lewat screenshot.
