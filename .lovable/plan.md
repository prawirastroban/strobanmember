# Redesign "Bagaimana cara booking" sesuai mockup

## Tampilan baru

```text
+------------------------------------------+
|   [foto bengkel, overlay gelap]          |
|      Bagaimana cara booking              |  <- judul putih tebal, tengah
+------------------------------------------+
|  (1)  [ikon]  BUKA WEBSITE STROBAN       |
|               Kunjungi situs resmi kami  |
|               ( 🌐 www.bengkelstroban.com )
|  - - - - - - - - - - - - - - - - - - -   |
|  (2)  [ikon]  PILIH LAYANAN SERVIS       |
|               ...                        |
|  ... sampai langkah 6                    |
+------------------------------------------+
```

Detail perubahan pada section ini:
1. **Banner foto di atas** (memakai `hero-bengkel.jpg`) dengan overlay gelap dan judul putih tebal "Bagaimana cara booking" di tengah — konsisten dengan section "Kenapa pilih Stroban ?" di atasnya. Label kecil "Panduan Aplikasi" dihapus.
2. **Baris langkah**: nomor dalam lingkaran merah di kiri, lalu kotak ikon putih (border tipis, sudut membulat) berisi ikon merah, lalu teks.
3. **Teks**: judul merah tebal huruf kapital, deskripsi abu-abu 2 baris. Judul langkah 1 menjadi "BUKA WEBSITE STROBAN".
4. **Garis pemisah putus-putus** horizontal antar langkah, dan garis vertikal putus-putus di belakang kolom nomor dengan panah kecil di ujung bawah.
5. Latar section abu muda lembut agar kartu ikon putih terlihat menonjol.
6. Kartu pembungkus per langkah dihapus (mockup memakai baris terbuka, bukan kartu).

## Yang tidak berubah
- Isi 6 langkah, urutan, dan link www.bengkelstroban.com (tetap domain asli, bukan "stroban.com" seperti di mockup).
- Section lain di beranda dan tampilan desktop.

## Catatan teknis
- Hanya `src/components/mobile/home/HowToBook.tsx` yang diubah.
- Warna memakai token semantik (`primary`, `card`, `muted-foreground`, `border`, `background`), tanpa warna hardcoded.
- Ikon lucide yang sudah ada tetap dipakai; garis putus-putus memakai utility border-dashed.
- Verifikasi lewat screenshot mobile 393x852.
