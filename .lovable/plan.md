# Hilangkan blur di header atas (iPhone, saat discroll) — 1 kredit

## Masalah di screenshot
Saat halaman discroll, garis merah di belakang jam/baterai terlihat buram: konten di bawahnya (kartu "Kenapa Stroban?") tembus samar, lalu ada pudaran merah yang mengambang di bawah garis itu. Tombol keranjang, lonceng dan menu juga punya cincin buram.

## Perubahan
1. **Bilah merah atas jadi solid dan tegas**
   - Bilah merah di belakang jam/baterai diberi warna merah pekat penuh, tanpa transparansi dan tanpa pudaran.
   - Tepi bawahnya dibuat lurus dan bersih, jadi tidak ada lagi gradasi merah yang "mengambang" di atas konten.
   - Konten yang discroll tidak lagi terlihat samar di balik bilah.
2. **Tombol keranjang, lonceng, menu tanpa blur**
   - Efek blur di balik ketiga tombol bulat dimatikan di HP. Tombol tetap bulat kaca dengan ikon putih, tapi tidak membuat konten di belakangnya buram.
3. **Tidak ada perubahan lain**: warna, posisi tombol, pencarian, kartu sapaan dan menu bawah tetap sama.

## Catatan
iPhone versi terbaru (iOS 26) kadang menambahkan efek buram sendiri di bawah jam. Dengan bilah atas yang solid, efek itu biasanya tidak muncul lagi. Saya akan cek di tampilan HP di preview, tapi tidak bisa mengecek di iPhone sungguhan.

## Detail teknis
- `src/components/Navbar.tsx`: fixed strip `homeHero` → solid `hsl(var(--primary))`, tinggi `env(safe-area-inset-top)` tepat, tanpa `+4px` overlap, `transform: translateZ(0)` agar dirender sebagai layer opaque; hapus backdrop-filter apa pun di nav mobile.
- `src/index.css`: di `@media (max-width: 1023px)`, `.glass-icon-btn` → `backdrop-filter: none; -webkit-backdrop-filter: none`, background semi-gelap tetap untuk kontras ikon.
- Verifikasi Playwright 390×844 posisi scroll atas dan tengah.
