# Hilangkan aksen putih di pinggir dekat tombol panah

## Tujuan
Menghilangkan tampilan "aksen putih" di tepi kiri/kanan area scroll kartu kendaraan (dan area scroll horizontal lainnya) yang muncul di samping tombol panah geser.

## Analisis
Aksen putih berasal dari overlay gradien di komponen `ScrollHintRow` (`src/components/ui/scroll-hint-row.tsx`):
- Sisi kiri: `<span className="... bg-gradient-to-r from-background to-transparent ..." />`
- Sisi kanan: `<span className="... bg-gradient-to-l from-background to-transparent ..." />`

Gradien ini memudar ke `background`, sehingga pada mode terang terlihat sebagai blok putih di tepi, terutama di dalam card dengan latar berbeda.

## Perubahan
1. **Hapus overlay gradien kiri/kanan** di `ScrollHintRow` tanpa mengubah tombol panah atau logika scroll.
2. **Hapus overlay gradien atas/bawah** di `ScrollHintColumn` agar konsisten (versi vertikal tidak lagi punya aksen putih).
3. Pastikan tombol panah (`ChevronLeft` / `ChevronRight`) tetap tampil dan berfungsi.

## Verifikasi
- Cek preview mobile pada bagian kartu kendaraan tersimpan.
- Pastikan tidak ada lagi blok putih di tepi kiri/kanan saat panah muncul.
- Pastikan panah geser masih bisa diklik dan menggeser daftar kendaraan.
