# Rapikan atas & bawah beranda HP (1 kredit)

1. **Atas merah menyatu sampai jam/baterai**: tambah lapisan merah tipis setinggi area status bar (iPhone/Android) yang tetap di atas, sehingga tidak ada lagi efek putih blur di atas. Warna tema browser juga diset merah Stroban. Tombol keranjang/notif/menu tetap terkunci seperti sekarang.
2. **Gap bawah footer dikurangi**: hapus ruang kosong ganda di bawah copyright; tersisa ruang secukupnya agar teks tidak tertutup menu bawah. Latar gelap tetap sampai dasar layar.
3. **Menu bawah lebih turun di iPhone**: jarak ke home bar iPhone dipangkas (menu duduk lebih dekat ke bawah), di Android tetap ada jarak kecil 8px.

## Detail teknis
- `Navbar.tsx`: div `fixed top-0 inset-x-0 lg:hidden` tinggi `env(safe-area-inset-top)` dengan kelas `home-red-bg` (z-50, pointer-events-none) bila `homeHero`/`redHeader`.
- `index.html`: `<meta name="theme-color">` merah.
- `Footer.tsx`: `max-lg:pb-24` -> `max-lg:pb-6` (halaman sudah punya ruang bawah untuk menu).
- `BottomNav.tsx`: bottom `max(8px, calc(env(safe-area-inset-bottom) - 12px))`.
- Cek Playwright 390x844.
