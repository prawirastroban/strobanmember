# Kartu Layanan sesuai mockup

## Tampilan baru
Empat kartu di section "Layanan" diubah persis seperti mockup:

- Kartu putih (card), sudut membulat besar, bayangan lembut, tanpa latar merah penuh.
- Ilustrasi 3D besar muncul di atas kartu dan sedikit meluber ke luar tepi atas/samping (efek "pop-out"), bukan ikon kecil di dalam kotak.
- Label merah tebal 2 baris di kiri-bawah kartu: "Ganti / Oli", "Ganti / Ban", "Paket / Servis", "Promo / Servis".
- Jarak antar kartu dan tinggi kartu mengikuti proporsi mockup (kartu potret, sedikit lebih pendek dari sekarang).
- Kartu Promo tetap sama gayanya dengan yang lain (putih + teks merah), sesuai mockup.

## Gambar
Empat file yang diunggah dipakai sebagai gambar kartu:
- Oil.png -> Ganti Oli
- Tire.png -> Ganti Ban
- Maintenance.png -> Paket Servis
- Discount.png -> Promo Servis

Gambar dipasang sebagai aset aplikasi (CDN) dan dipetakan ke kategori berdasarkan slug kategori (mis. oli/oil, ban/tires, maintenance/paket, promo). Jika sebuah kategori tidak punya gambar yang cocok, kartu memakai ikon kategori seperti sekarang sebagai cadangan.

## Yang tidak berubah
- Sumber data kategori tetap dari database, urutan tampil dan navigasi ke `/katalog?category=...` tetap.
- Searchbar "Apa masalah mobil anda ?" dan section lain tidak diubah.

## Catatan teknis
- Hanya `src/components/mobile/home/ServiceCategoryGrid.tsx` yang diubah, plus pointer aset baru di `src/assets/`.
- Warna teks memakai token `primary` / `card` (aman untuk mode gelap), tanpa hex baru.
- Gambar diberi `alt` deskriptif dan `loading="lazy"`.
- Verifikasi dengan screenshot mobile 393x686 dan dibandingkan dengan mockup.
