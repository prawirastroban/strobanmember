# Hilangkan Garis Tepi Hitam di Sheet Detail Layanan

## Masalah
Pada bottom sheet detail layanan di halaman Katalog, terlihat garis gelap tipis di sekeliling area gambar slideshow. Sumbernya dua hal:
- Bottom sheet memakai garis batas atas (`border-t`) yang tampak sebagai garis gelap tepat di atas gambar.
- Wadah gambar memakai latar `bg-muted` yang terlihat sebagai bingkai gelap saat gambar belum penuh/masih loading.

## Perubahan
1. Pada sheet detail layanan (`src/pages/Katalog.tsx`): hilangkan garis batas atas sheet untuk tampilan tanpa garis (`border-t-0`).
2. Wadah slideshow: ganti latar `bg-muted` menjadi transparan agar tidak ada bingkai gelap di tepi gambar.
3. Sudut atas sheet tetap membulat dan gambar tetap terpotong rapi mengikuti radius.

Tidak ada perubahan logika, data, atau backend.
