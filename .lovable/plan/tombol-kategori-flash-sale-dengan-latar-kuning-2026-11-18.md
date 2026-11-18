# Tombol kategori Flash Sale dengan latar kuning

## Yang berubah
Di deretan kategori Katalog, hanya tombol **FLASH SALE !** yang tampil berbeda:
- **Belum dipilih:** latar kuning cerah, tulisan hitam pekat, ikon petir kecil di depan nama, garis tepi kuning tua.
- **Sedang dipilih:** kuning lebih pekat ditambah lingkar merah Stroban tipis, supaya kelihatan sedang aktif.
- Tampil jelas di mode terang maupun gelap, tidak tertutup efek kaca.

## Yang tidak diubah
Urutan kategori, nama "FLASH SALE !", isi produk, tombol kategori lain, dan halaman lain tetap seperti sekarang.

## Detail teknis
- `src/pages/Katalog.tsx`: tombol dikenali sebagai Flash Sale bila nama kategorinya mengandung "flash" (tidak peka huruf besar/kecil). Tombol ini memakai kelas `katalog-pill-flash` dan ikon `Zap` dari lucide.
- `src/index.css`: tambah token `--flash` (kuning) dan gaya `.katalog-pill-flash`, dikecualikan dari aturan kaca kartu global agar latar kuning tidak ditimpa.
- Perkiraan: 1 kredit.
