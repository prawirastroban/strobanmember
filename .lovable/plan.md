Bersihkan `src/App.css` dari style default Vite (`#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center }` dan demo `.logo`/`.card`/`.read-the-docs`/`logo-spin`). Style ini yang menyebabkan saat refresh tampilan awal: header terlihat di tengah (karena `max-width` + `margin: auto`), konten turun (karena `padding: 2rem`), dan BottomNav tampak hilang/tergeser pada frame pertama sebelum hidrasi.

Setelah dibersihkan, layout sepenuhnya dikontrol Tailwind di tiap komponen, sehingga refresh menampilkan halaman full-width mentok ke atas, Navbar dan BottomNav langsung pada posisi yang benar.

Tidak ada perubahan logic atau komponen lain.