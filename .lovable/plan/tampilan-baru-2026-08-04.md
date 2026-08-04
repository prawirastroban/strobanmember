Redesign kartu Katalog sesuai mockup

## Tampilan baru

```text
+---------------------------------------------+
| [foto ]  Paket Servis Bronze                |
| [ 1:1 ]  Servis lengkap termasuk ganti oli  |
| [      ]  Rp 650.000            [ 🛒 ]      |
+---------------------------------------------+
+---------------------------------------------+
| [foto ]  Paket Servis Silver ...            |
+---------------------------------------------+
```

Perubahan:

1. **Judul "Katalog Layanan" dan subjudulnya dihapus.** Halaman langsung dimulai dari kolom pencarian lalu filter kategori.
2. **Grid 2 kolom diganti menjadi daftar 1 kolom** kartu horizontal (di layar besar tetap melebar jadi 2 kolom agar tidak terlalu panjang).
3. Struktur tiap kartu:
  - Blok media di kiri (persegi, sudut membulat) — memakai slideshow/foto layanan yang sudah ada; kalau tidak ada foto, blok berwarna merah brand seperti di mockup.
  - Kanan: nama layanan (merah, tebal), deskripsi singkat 2 baris abu-abu, lalu harga besar tebal ("Rp 650.000").
  - Tombol keranjang merah bulat di kanan bawah kartu untuk menambah ke pesanan; berubah jadi centang bila sudah ada di pesanan.
  - Badge (Most Value / Popular, dll.) tetap tampil kecil di atas nama.
4. Klik area kartu tetap membuka dialog detail seperti sekarang.
5. Bar keranjang mengambang di bawah ("1 item") sudah ada dan tetap dipakai.

## Yang tidak berubah

- Sumber data layanan, filter kategori, pencarian, dialog detail, logika keranjang dan booking.
- Halaman lain.

## Catatan teknis

- Hanya `src/pages/Katalog.tsx` yang diubah (header, skeleton, dan blok kartu).
- Warna memakai token semantik (`primary`, `card`, `muted-foreground`, `border`), tanpa hex hardcoded.
- Durasi layanan ditampilkan sebagai teks kecil di samping harga agar informasi tidak hilang.
- Verifikasi lewat screenshot mobile 393x852.
- tambahkan kriteria produk diinfokan untuk moil apa saja, dan informasi garansi di setiap produk 
  &nbsp;