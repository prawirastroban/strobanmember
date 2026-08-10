# Kartu Katalog: Kotak 1:1 & Tautan "Desc >"

## Masalah
- Kotak gambar disetel 1:1, tapi tinggi kartu ditentukan blok teks yang lebih tinggi, sehingga gambar terlihat tidak persegi/serasi dengan kartu.
- Deskripsi panjang ("Isi Paket : 1. ... 2. ...") memakan 2–3 baris dan membuat kartu berantakan.

## Perbaikan
1. **Gambar benar-benar 1:1** — kotak thumbnail memakai rasio dari setelan sebagai penentu tinggi kartu: gambar persegi penuh dari atas ke bawah kartu, dan blok teks di kanan menyesuaikan tinggi tersebut. Kartu jadi seragam tingginya.
2. **Ganti deskripsi dengan tautan "Desc >"** — di kartu, teks isi paket diganti satu baris tautan kecil bertuliskan **Desc ›** (warna primary). Diklik akan membuka bottom sheet detail yang menampilkan deskripsi lengkap seperti sekarang.
3. Chip garansi, harga, durasi, dan tombol keranjang tetap ada, jaraknya dirapatkan agar pas di dalam tinggi kartu yang baru.
4. Kartu tanpa thumbnail khusus tetap memakai media/slideshow lama dengan tinggi mengikuti aturan yang sama.

## Catatan teknis
- Perubahan hanya di `src/pages/Katalog.tsx`: blok media memakai `aspect-ratio` dari `ratioToNumber(thumbnail_ratio)` sebagai penentu tinggi baris kartu (`items-stretch` + tinggi dari media), dan helper `describeLines` tidak lagi dipakai untuk kartu (deskripsi lengkap tetap di sheet detail).
- Tautan "Desc ›" memicu `setInfoService(s)` yang sama dengan tombol info.
- Verifikasi lewat screenshot mobile 393x852.