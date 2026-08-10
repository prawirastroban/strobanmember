# Kartu Layanan tanpa panel & judul

## Perubahan
- Hapus judul "Layanan".
- Hapus panel/kartu kaca besar yang membungkus keempat kartu (background, border, shadow, blur). Kartu langsung tampil di atas latar halaman seperti mockup.
- Rapatkan ilustrasi dengan kartunya: gambar hanya menyembul sedikit di atas kartu sehingga terlihat menyatu (tidak ada jarak kosong seperti sekarang).
- Kartu putih dibuat sedikit lebih pendek dan teks merah 2 baris tetap di kiri-bawah, mengikuti proporsi mockup.
- Jarak antar kartu dan margin kiri-kanan disesuaikan agar keempat kartu memenuhi lebar layar seperti mockup.

## Yang tidak berubah
- Sumber kategori dari database, urutan, dan navigasi ke `/katalog?category=...`.
- Searchbar "Apa masalah mobil anda ?" dan section lain.

## Catatan teknis
- Hanya `src/components/mobile/home/ServiceCategoryGrid.tsx`.
- Wrapper glass (style background/border/boxShadow/backdropFilter) dihapus; grid dipasang langsung dengan padding horizontal 12px.
- Overlap gambar diatur lewat `top` negatif yang lebih kecil + padding-top grid yang lebih kecil, teks tetap token `primary`.
- Verifikasi screenshot mobile 394x686 dibanding mockup.
