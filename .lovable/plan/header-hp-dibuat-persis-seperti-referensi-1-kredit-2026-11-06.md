# Header HP dibuat persis seperti referensi (1 kredit)

Target: satu bidang merah utuh dari tepi atas layar (di balik jam/baterai) sampai bawah area pencarian — tanpa blur, tanpa garis sambungan.

## Perubahan
1. **Hapus garis sambungan**: saat ini header (logo + ikon) dan area pencarian adalah dua blok merah terpisah dengan tekstur yang tidak nyambung, sehingga terlihat garis. Keduanya dijadikan satu latar merah dengan gradasi & tekstur lengkung yang menyambung mulus.
2. **Hapus blur atas**: semua efek blur/bayangan/garis bawah pada header HP dimatikan; area status bar memakai merah yang sama persis dengan header.
3. **Tombol ikon seperti referensi**: bulatan kaca terang transparan (putih tipis, tepi putih halus) dengan ikon putih — bukan bulatan gelap seperti sekarang.
4. Ukuran dan posisi logo, search, dan kartu sapaan tidak diubah.

## Teknis
- `index.css`: `.home-hero-nav` latar transparan di HP; pindahkan latar merah + tekstur ke satu wrapper yang mencakup area safe-area + nav + search (atau nav transparan di atas `section > .home-red-bg` yang diperpanjang ke atas dengan `margin-top` negatif setinggi nav). Hapus `border-b`, `shadow`, `backdrop-filter` di header mobile.
- `.home-hero-nav .glass-icon-btn`: `background: hsl(0 0% 100% / 0.18)`, `border: hsl(0 0% 100% / 0.35)`, tanpa bayangan gelap.
- Strip merah safe-area memakai warna awal gradasi yang sama.
- Cek Playwright 390×844 (atas & saat scroll); verifikasi iPhone oleh user.
