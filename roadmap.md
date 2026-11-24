# Dashboard: satu judul utama
- [x] Perbaiki layar pembaruan Android: versi terpasang dibaca langsung, tombol Google Play tetap muncul saat di bawah minimum; empat tes lolos dan tujuan tombol terverifikasi melalui simulasi Android (perangkat fisik belum diuji).
- [x] Periksa judul utama berulang dan pemakaian ulang panel.
- [x] Rapikan kepemilikan judul dan panel yang mengulang judul utama.
- [x] Verifikasi 41 halaman, tab turunan, serta judul di layar besar/HP.

# Pratinjau SPK: tombol tutup
- [x] Pisahkan tombol tutup dari Unduh dan rapikan header di layar besar/HP.
- [x] Uji pratinjau, tutup, Bagikan, dan Unduh dengan SPK tersimpan di komputer dan HP; PDF berhasil diunduh, tombol tidak bertumpuk, tanpa kesalahan aplikasi.

# Pricelist Oli
- [x] Sesuaikan pembacaan Excel dan tampilan kategori Oli dengan unggahan.
- [x] Masukkan data Oli tanpa mengubah pricelist Ban.
- [x] Uji import, pencarian, dan perpindahan kategori.

# Pricelist: keterangan kendaraan ringkas
- [x] Sejajarkan kendaraan dengan ukuran/nama tanpa mengubah data atau harga.
- [x] Tampilkan tombol pop-up hanya ketika keterangan kendaraan terpotong.
- [x] Periksa tampilan dan pop-up pada semua kategori, layar lebar dan HP.

# Pricelist: tombol filter lebih tipis
- [x] Turunkan tinggi tombol pilihan filter dari 44px menjadi ±20px (HP ±24px).
- [x] Rapikan judul grup, jarak antar grup, bantalan panel, dan tombol Reset.
- [x] Periksa keempat tab serta sheet filter HP: label terbaca, penanda aktif tetap merah, tidak ada teks terpotong.

# Pricelist: badge type & rim lebih tipis
- [x] Turunkan tinggi badge type dan rim dari 22px menjadi ±14px tanpa mengecilkan hurufnya.
- [x] Perkecil padding atas-bawah tiap baris nama barang agar baris lebih ramping.
- [x] Periksa keempat tab dan HP: badge terbaca, tidak terpotong, baris tidak melebar keluar layar.

- [x] SPK Ban: pilihan jenis, label & filter jenis di daftar SPK
- [x] SPK Ban: isian khusus ban + PDF sesuai template

# Loading SPK lama
- [x] Batasi waktu pemuatan, tangani kegagalan, dan pisahkan label cabang dari pemuatan dokumen.
- [x] Uji SPK lama tersimpan, pratinjau, serta kegagalan koneksi dan coba lagi; data kembali tampil, tiga pengujian lolos.

# RLS banner: tahap 1
- [x] Audit ulang empat policy dan pisahkan SELECT publik/staf melalui migration dengan rollback berupa komentar.
- [x] Katalog menunjukkan lima policy dan tiga policy tulis identik; tiga tes migration lolos. Request anon membaca satu banner aktif dan nol banner nonaktif. Customer/admin/staff diverifikasi pada definisi policy saja; operasi tulis tidak dijalankan agar data produksi tetap utuh.

# RLS transaksi: tahap 2A
- [x] Audit ulang 29 policy pada bookings, invoices, payments, user_roles; cocok dengan inventaris sebelum persetujuan.
- [x] Ubah hanya target 11 policy staf langsung menjadi authenticated dengan pengaman inventaris dan rollback yang dapat ditinjau.
- [x] Verifikasi katalog: 29 policy tetap, ekspresi identik, 18 policy lainnya tetap; tanpa operasi data atau sesi operasional.
- [ ] Perbaiki satu assertion tes statis yang salah membaca kata INSERT/UPDATE/DELETE dalam nama policy; menunggu persetujuan pengguna, database sudah terverifikasi. Dua tes tahap 2A dan tiga tes banner lolos.
