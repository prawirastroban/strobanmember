# Header merah tembus sampai atas (seperti referensi hijau)

Masalah: di iPhone (Safari), area jam/baterai masih putih-blur. Penyebabnya: Safari mewarnai area atas berdasarkan warna latar halaman (putih), dan lapisan merah tambahan hanya setinggi "safe-area" yang di Safari bernilai 0, jadi tidak terlihat.

## Perubahan (1 kredit)
1. Latar halaman paling luar (html/body) di HP dibuat merah Stroban, sehingga Safari mewarnai area status bar merah, bukan putih blur. Konten di bawah header tetap putih seperti sekarang (area konten diberi latar putih sendiri).
2. Lapisan merah di atas dibuat menempel di tepi atas layar dengan tinggi minimal agar Safari "membaca" warna merah (berlaku juga saat dibuka dari Safari biasa, bukan hanya dari layar utama).
3. Gradasi/tekstur merah header dilanjutkan sampai ke balik jam & baterai, tanpa garis batas atau blur — seperti contoh hijau.
4. Ikon status bar (jam, sinyal, baterai) tetap terbaca di atas merah.

## Teknis
- `src/index.css`: di `max-lg`, `html, body { background: hsl(var(--primary)) }`; `#root`/main content `bg-background`.
- `Navbar.tsx`: strip merah `fixed top-0` dengan `height: max(env(safe-area-inset-top), 1px)` dan tekstur sama, hapus sisa backdrop-blur di mobile.
- Cek Playwright 390×844; verifikasi Safari iPhone sungguhan oleh user.
