# Perbaikan Tombol Kategori Layanan Home Mobile

## Tujuan
Memperbaiki tombol kategori layanan di home mobile (`ServiceCategoryGrid.tsx`) agar:
1. Tidak terlalu panjang ke bawah.
2. Ilustrasi 3D tidak terlihat berjauhan dari card.
3. Ilustrasi berada simetris di tengah card.

## Temuan Saat Ini
- Card memakai `aspectRatio: 0.78` sehingga cukup tinggi untuk grid 4 kolom.
- Container grid diberi `padding: "44px 0 0"` dan gambar diposisikan `top: -44` / `left: -16%` / `width: 132%`.
- Posisi `left: -16%` dengan `width: 132%` membuat gambar melebihi card dan tidak berpusat secara visual.
- Jarak 44 px atas-bawah membuat ilustrasi terlihat "mengambang" jauh dari card.

## Perubahan yang Diusulkan
1. **Kompres card**: ubah `aspectRatio` dari `0.78` menjadi `0.82`–`0.85` dan kurangi padding bawah agar card lebih ringkas.
2. **Rapatkan ilustrasi ke card**: turunkan `top` gambar (misal dari `-44` ke `-28`/`-32`) dan kurangi `paddingTop` grid agar ilustrasi menyatu dengan tepi card tanpa terlalu berjarak.
3. **Pusatkan gambar secara simetris**: ganti posisi horizontal absolut dari `left: "-16%"` menjadi kombinasi `left: "50%"` + `transform: "translateX(-50%)"`, dengan `width` disesuaikan (misal `110%`–`120%`) agar gambar tetap proporsional dan berpusat.
4. **Jaga teks tetap terbaca**: pastikan `lineHeight` dan ukuran font label 2-baris tetap muat setelah card dipendekkan.
5. **Verifikasi visual**: buka preview mobile, periksa 4 tile (Ganti Oli, Ganti Ban, Paket Servis, Promo Servis) agar simetris dan tidak ada teks/ikon yang terpotong.

## File yang Terdampak
- `src/components/mobile/home/ServiceCategoryGrid.tsx` (style inline card, grid, dan gambar).

## Bukan Scope
- Tidak mengubah label kategori, mapping gambar, logika navigasi, atau data kategori dari database.
