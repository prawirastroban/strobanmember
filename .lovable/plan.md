# Perbaiki Banner "Kenapa pilih Stroban" & "Bagaimana cara booking"

## Masalah
Foto bengkel di kedua banner sebenarnya masih ter-load, tetapi terlihat "hilang" karena:
- Tinggi banner dipangkas ke 132px pada perapian spacing sebelumnya, sehingga hampir seluruh bidang tertutup teks judul.
- Lapisan gelap di atas foto memakai opasitas 65% rata, membuat gambar nyaris tidak terlihat.

## Perbaikan
- Naikkan tinggi banner ke ~170px agar foto kembali terbaca, tanpa mengembalikan banner raksasa 16:9 lama.
- Ganti overlay rata 65% dengan gradasi gelap (lebih pekat di bawah, lebih terang di atas) sekitar 30–55% supaya foto terlihat dan teks tetap kontras.
- Tambahkan sedikit text-shadow pada judul agar tetap terbaca di area foto yang terang.
- Terapkan sama persis di kedua banner supaya konsisten.

## Teknis
File yang diubah:
- `src/components/mobile/home/TrustStrip.tsx`
- `src/components/mobile/home/HowToBook.tsx`

Perubahan: `h-[132px]` → `h-[170px]`; `bg-foreground/65` → overlay gradien (`bg-gradient-to-b from-foreground/35 via-foreground/45 to-foreground/60`); judul diberi drop-shadow. Spacing antar section (mt-5/mb-5) tidak diubah.
