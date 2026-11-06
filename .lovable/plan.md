# Header merah menyatu sampai atas di iPhone (1 kredit)

## Penyebab yang ditemukan
- Pengaturan status bar iPhone masih "default", jadi iOS menaruh bilah putih/blur di atas aplikasi, bukan menembuskan konten.
- Lapisan merah di area status bar hanya aktif di Beranda, dan halaman di belakangnya tetap putih, jadi saat ditarik/scroll bagian paling atas terlihat putih buram.
- Ada garis tipis di bawah header yang membuat sambungan terlihat.

## Perubahan
1. Status bar iPhone diubah ke mode tembus (black-translucent) agar latar merah tampil sampai ujung layar paling atas, jam & baterai tetap putih terbaca.
2. Lapisan merah area status bar dibuat aktif di semua menu yang memakai header merah (bukan hanya Beranda), tanpa blur.
3. Latar paling atas halaman di HP diberi warna merah yang sama, jadi saat layar ditarik ke bawah tidak muncul putih.
4. Hapus garis tepi bawah header di HP agar merah menyatu dengan konten.

## Detail teknis
- `index.html`: `apple-mobile-web-app-status-bar-style` -> `black-translucent` (viewport-fit=cover sudah ada).
- `Navbar.tsx`: strip `env(safe-area-inset-top)` berlaku saat `redHeader`, tanpa backdrop-blur; `max-lg:border-b-0` saat merah.
- `index.css`: di mobile, `html` background merah primary (body tetap background) agar overscroll atas merah.
- Verifikasi Playwright 393x852; tampilan status bar asli iPhone perlu dicek di HP.
