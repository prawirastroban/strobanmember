# Tombol Panah Scroll pada Deskripsi Layanan di Modal Katalog

## Tujuan
Menambahkan indikator tombol panah (scroll hint) pada bagian deskripsi layanan di modal detail katalog, jika konten deskripsi masih bisa digulir ke bawah.

## Perubahan yang Dilakukan
1. **Ubah pembungkus deskripsi** di `src/pages/Katalog.tsx` baris 454–462:
   - Bungkus area deskripsi dengan `ScrollHintColumn` dari `@/components/ui/scroll-hint-row`.
   - Berikan tinggi maksimum agar deskripsi panjang dapat di-scroll (contoh: `max-h-[180px]`).
2. **Pertahankan tampilan yang sudah ada**:
   - Judul "Deskripsi Layanan" tetap di atas.
   - Teks deskripsi tetap mempertahankan `whitespace-pre-line` dan gaya tipografi saat ini.
3. **Tambahkan perilaku scroll hint**:
   - Tombol panah ke bawah muncul otomatis jika deskripsi melebihi tinggi maksimum.
   - Tombol panah ke atas muncul setelah user menggulir ke bawah.
   - Tombol panah dapat diklik untuk menggulir deskripsi ke atas/bawah.
4. **Verifikasi**:
   - Build TypeScript berhasil.
   - Preview mobile: deskripsi layanan dengan teks panjang menampilkan tombol panah bawah, dan bisa digulir.
   - Deskripsi pendek tidak menampilkan tombol panah.
