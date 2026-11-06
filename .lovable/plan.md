# Beranda HP ala Speedwork (versi Stroban merah)

Hanya tampilan Beranda di HP. Tampilan desktop, alur booking, dan data tidak berubah. Perkiraan biaya: 1 kredit Build. Diskusi ini tidak memakai kredit.

## Susunan baru (dari atas ke bawah)

```text
+-------------------------------------------+
| [foto merah melengkung sebagai latar]      |
| [Logo]  [ Apa masalah mobil anda? ]  [🛒][🔔][☰] |
|                                            |
|   +-----------------------------------+    |
|   | Selamat datang     Voucher  Poin  |    |  <- kartu putih melayang
|   | Pras               🎟 0     ⭐ 0  |    |
|   +-----------------------------------+    |
|--------- latar putih membulat ------------|
|  Ganti Oli  Ganti Ban  Paket Servis  Promo |
|                                            |
|  Promo menarik untukmu                     |
|  [ banner slider ]   • • •                 |
+-------------------------------------------+
```

1. **Latar atas**: gradasi hijau Speedwork diganti foto merah yang Anda unggah, dipasang penuh di belakang header dan setengah kartu sambutan, lalu bagian bawah melengkung ke putih (persis referensi).
2. **Baris header**: kiri logo Stroban, tengah kolom "Apa masalah mobil anda?" berbentuk pil putih (menggantikan "Mau cari apa?" dan tetap membuka fitur konsultasi masalah yang sudah ada), kanan tombol keranjang, notifikasi, menu.
3. **Tombol kanan atas pakai Glisses murni**: bulatan kaca bening (putih transparan, kilau di tepi, bayangan dalam), ikon putih, **tanpa aksen merah**. Angka notifikasi tetap terlihat sebagai titik kecil.
4. **Kartu sambutan di tengah (baru)**: "Selamat datang" + nama pelanggan, lalu kolom Voucher (jumlah voucher yang bisa dipakai) dan Poin (saldo poin loyalitas). Ketuk Voucher membuka halaman voucher/rewards, ketuk Poin membuka halaman poin. Jika belum masuk: "Selamat datang, Tamu" + tombol "Masuk".
5. **Ikon layanan**: 4 ikon (Ganti Oli, Ganti Ban, Paket Servis, Promo Servis) disusun satu baris rapi di atas latar putih, ukuran teks kecil proporsional seperti referensi.
6. **Promo**: judul "Promo menarik untukmu" + banner slider yang sudah ada dengan titik penanda di bawah.
7. **Dirapikan agar ringkas**: kotak konsultasi lama dan kartu klaim voucher yang terpisah dilebur ke elemen di atas, sehingga tidak dobel.

## Yang perlu Anda putuskan
- Pojok kiri atas: **logo Stroban** (usulan saya) atau dibiarkan kosong?
- Tampilan baru ini hanya di Beranda, atau header merah yang sama juga dipakai di halaman lain (Pesanan, Akun)? Usulan: hanya Beranda; halaman lain tetap seperti sekarang.

## Detail teknis
- Foto merah diunggah ke penyimpanan aset (pointer `.asset.json`), dipakai sebagai `background-image` cover.
- Komponen baru `MobileHomeHeader` (header + kartu sambutan) dipasang di bagian `lg:hidden` `Index.tsx`; Navbar global disembunyikan di Beranda HP agar header tidak dobel.
- Data: nama dari `profiles`, poin dari `loyalty_points`, voucher dari promo yang sudah diklaim/aktif (`promo_claims`) — hanya dibaca, tanpa ubah database.
- Tombol kaca: `bg-white/15 border-white/30 backdrop-blur-xl` + inner shadow putih, ukuran 44px; kolom pencarian `h-11 text-base`.
- `ServiceCategoryGrid` diringkas ke 4 kolom, `HeroBookingForm` dibuka lewat pil pencarian, `VoucherClaimCard` dilepas dari Beranda HP.
