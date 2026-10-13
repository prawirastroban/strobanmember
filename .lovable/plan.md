# Badge Type & Rim dibuat lebih tipis, baris nama barang lebih compact

## Kondisi saat ini (sudah diukur di preview)

- Badge "RADIAL" (type) dan "R14" (rim) tingginya **22px** padahal teksnya hanya 9px. Penyebabnya: aturan gaya badge global memaksa tinggi minimum 22px dengan padding 4px di atas-bawah dan garis tepi 1,5px, sehingga tinggi tombol kecil ini tidak mengikuti ukuran hurufnya.
- Baris nama barang di tab Ban tingginya **59px** (padding 8px atas-bawah + baris badge 22px + baris nama 20px). Di HP 103px.
- Karena badge ikut menentukan tinggi baris, tiap baris "kebagian" 8px空间 yang sebenarnya kosong.

## Yang akan berubah

1. **Badge type & rim: 22px → sekitar 14px.** Huruf tetap 9px agar masih terbaca, padding diperkecil, garis tepi ditebalkan tipis jadi 1px.
2. **Baris nama barang: 59px → sekitar 46px** di layar besar (HP ±89px) — sekitar 22% lebih ramping, jadi lebih banyak barang terlihat tanpa perlu scroll.
3. Jarak antara brand, badge type, dan badge rim sedikit diperketat.
4. **Tidak berubah**: isi badge (tetap "RADIAL", "R14"), warna dan aksen merah, urutan badge, kolom harga, pencarian, panel filter, tombol detail kendaraan, dan seluruh perilaku lainnya.

## Detail teknis

Hanya di `src/pages/Pricelist.tsx`, tanpa mengubah data, query, maupun aturan akses:

- Baris 254 (badge type) dan 255 (badge rim): `h-4 shrink-0 px-1.5 text-[9px]` → `h-3.5 min-h-0 shrink-0 border px-1 py-0 text-[9px] leading-none`. Kelas `min-h-0` menimpa `min-height: 22px` milik gaya badge global (aturan itu tinggal di `@layer components`, dan utilitas Tailwind di `@layer utilities` menang atasnya), sementara `h-3.5` mengunci tingginya di 14px.
- Baris 250: `py-2` → `py-1.5` (padding atas-bawah tiap baris 8px → 6px).
- Baris 252: `gap-1.5` → `gap-1`.
- Gaya badge global di `src/index.css` tidak disentuh, karena dipakai juga oleh badge di halaman lain.

## Pemeriksaan

- Playwright di localhost:8080 dengan sesi staf: ukur tinggi badge sebelum (22px) dan sesudah (target ±14px), serta tinggi baris Ban sebelum (59px) dan sesudah (target ≤48px); bandingkan jumlah baris yang terlihat di layar sebelum dan sesudah.
- Cek keempat tab (Ban, Oli, Spareparts, Jasa): badge tetap terbaca, tetap satu baris sejajar brand, tidak ada teks terpotong.
- Cek HP 390px: baris tidak melebar keluar layar, harga tetap rapi di bawah nama, badge tetap tampil.
