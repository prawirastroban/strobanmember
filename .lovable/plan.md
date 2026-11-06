# Rapikan header, footer, menu bawah & ulasan (1 kredit)

1. **Ikon kanan atas tanpa latar**: hapus kapsul gelap di belakang keranjang/notifikasi/menu; hanya 3 bulatan kaca (Glisses) yang tetap terkunci di pojok kanan atas. Tambah sedikit bayangan agar tetap terlihat di atas konten putih.
2. **Footer tidak terlalu panjang**: kurangi ruang kosong di bawah copyright (cukup setinggi menu bawah), latar gelap tetap menutup sampai dasar layar.
3. **Menu bawah iPhone lebih turun**: jarak dari home bar iPhone dikurangi (dari +10px jadi ~+2px di atas safe-area), Android tetap ada jarak kecil.
4. **Ulasan Pelanggan seperti referensi**:
   - Judul kiri "Ulasan Pelanggan" + "Lihat semua" merah di kanan.
   - Satu kartu kaca: angka besar 4.9, bintang, "1.200+ ulasan"; di kanan bar distribusi 5/4/3 bintang (92% / 6% / 2%).
   - Di bawahnya 2–3 ulasan terbaru dengan pemisah: inisial bulat, nama, layanan · kota, badge VERIFIED hijau lembut, kutipan miring, tanggal · bintang.
   - Ganti auto-scroll vertikal lama; data ulasan tetap dari database.

## Detail teknis
- `Navbar.tsx`: hapus kelas `max-lg:bg-foreground/20 p-1 backdrop-blur shadow` dari cluster kanan.
- `Footer.tsx`: `max-lg:pb-28` jadi `max-lg:pb-24`, cek ulang.
- `BottomNav.tsx`: bottom `calc(env(safe-area-inset-bottom) + 2px)`, fallback 10px bila inset 0 via `max()`.
- `Testimonials.tsx`: layout baru, angka persentase statis sesuai referensi; distribusi memakai token semantik.
- Verifikasi Playwright 390x844.
