# Audit Aplikasi Pelanggan (Non-Dashboard) → Laporan PDF

## Tujuan
Memeriksa seluruh halaman sisi pelanggan (beranda dan turunannya, di luar Dashboard Panel), menemukan alur yang tidak berjalan benar dan fitur yang masih kurang, lalu menyajikannya dalam satu laporan PDF berbahasa Indonesia sebagai dasar maintenance.

## Cakupan
- Beranda mobile: banner slider, searchbar keluhan, kartu kategori layanan, checklist akun, voucher, Trust Strip, Bagaimana cara booking, testimoni, footer, bottom nav.
- Beranda desktop: hero, stats, katalog layanan, why us.
- Halaman pelanggan: Katalog, Booking, MyBooking, BookingStatus, ServiceProgress/ServiceCompleted, Promo, Loyalty, Referral, Cashback, HistoryPerawatan, MyVehicles/VehicleDetail, Profile, NotificationCenter, Cabang, Feedback, Invoice/ManualPayment, tracker publik, dan alur Auth (login, Google, reset password, klaim akun, onboarding).

## Yang diperiksa per halaman
1. Reachability — route aktif, tautan dari navigasi/bottom nav, halaman arsip yang masih tertaut.
2. Kebenaran alur — aksi utama (booking, klaim voucher, checkout, simpan kendaraan, ubah profil) benar-benar tersimpan dan tercermin di UI.
3. Izin data — apakah aturan akses database mendukung pengguna biasa (termasuk yang belum terverifikasi).
4. Kelengkapan state — loading, kosong, error, offline, dan konfirmasi aksi berbahaya.
5. Konsistensi UI mobile/Android — tombol terpotong, gap berlebih, ukuran teks, safe area.
6. Bahasa & konsistensi konten — label Inggris di UI Indonesia, penamaan brand, format harga/tanggal.
7. Performa & sinkronisasi konten realtime.

## Metode
- Telusuri route + registry halaman, bandingkan dengan komponen yang benar-benar ada.
- Baca komponen tiap halaman untuk aksi tulis, penanganan error, dan state kosong.
- Uji jalan langsung di preview (guest dan pengguna login) memakai browser headless: buka tiap halaman, catat error konsol/jaringan, ambil bukti tangkapan layar.
- Periksa aturan akses tabel utama yang dipakai halaman pelanggan.

## Hasil (deliverable)
Satu PDF di area dokumen berisi:
- Ringkasan eksekutif + skor kesehatan per area (Beranda, Booking, Katalog & Promo, Akun & Loyalty, Auth/Onboarding).
- Tabel temuan: Halaman | Masalah | Dampak | Tingkat (Kritis/Sedang/Ringan) | Rekomendasi.
- Daftar terpisah "tidak berfungsi benar" vs "kurang lengkap".
- Rekomendasi penyederhanaan tampilan pelanggan.
- Rencana maintenance bertahap (Tahap 1 kritis, Tahap 2 penyederhanaan, Tahap 3 pemolesan).

## Catatan teknis
- Audit baca-saja; tidak ada perubahan kode atau data pada tahap ini.
- PDF dibuat dengan reportlab + font Unicode (DejaVu Sans), aksen brand merah #ff2b2b, diperiksa halaman per halaman sebelum diserahkan.
- Perbaikan dikerjakan menyusul setelah Anda menyetujui daftar prioritas.
