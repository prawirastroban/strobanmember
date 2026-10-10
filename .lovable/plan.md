# Pricelist Ban (Sesi 1)

Halaman /pricelist khusus tim, tampilan liquid-glass gelap seperti gambar referensi, fokus dulu di kategori BAN.

## Tampilan
```text
+---------------------------------------------+------------------+
| Selamat Pagi, {Nama} 👋        [Cari....]   | Filter           |
| 1.704 item ban · update terakhir 10 Okt     | Brand  [chips]   |
| [Import Excel] (admin/owner)                | Type   [chips]   |
|---------------------------------------------| Pattern [list]   |
| Kartu/baris: BRAND · PATTERN                | Rim    [13..22]  |
|  185/65 R14 · Radial · R12-R14              | [Reset filter]   |
|  Grosir | External | HEB | Retail           |                  |
|  Cocok: Avanza, Xenia...                    |                  |
+---------------------------------------------+------------------+
        [ BAN ]  [ OLI ]  [ SPAREPARTS ]  [ JASA ]   (floating)
```
- Sapaan sesuai jam (Pagi/Siang/Sore/Malam) + nama akun yang login.
- Floating switch bawah: BAN aktif; OLI, SPAREPARTS, JASA tampil "Segera Hadir".
- Panel filter kanan (desktop) / sheet dari bawah (HP): Brand, Type, Pattern, Rim — multi-pilih, jumlah item per opsi.
- Daftar dengan pagination/scroll bertahap agar 1.700 baris tetap ringan.

## Pencarian pintar
Satu kotak cari yang mengerti beda format, contoh semua ini menemukan ukuran 185/65 R14:
`185/65R14`, `185 65 14`, `1856514`, `185-65-r14`, `r14 185`.
Juga cocok ke brand, pattern, dan model mobil (mis. "avanza", "accelera gamma"). Tidak peka huruf besar/kecil, dan tiap kata harus cocok (pencarian bertingkat).

## Import Excel
- Format persis file yang Anda kirim (sheet BAN, kolom BRAND, TYPE, KATEGORI, PATTERN, RIM, SIZE, GROSIR, EXTERNAL, HEB, RETAIL, VEHICLE MODEL).
- Pratinjau sebelum simpan: jumlah baris baru, berubah harga, error (mis. harga kosong).
- Mode: ganti seluruh daftar ban (default) — data lama diganti isi file.
- Hanya admin/owner yang bisa import; staf, admin cabang, mekanik hanya melihat.
- Saya akan mengimpor file yang Anda kirim sebagai data awal.

## Detail teknis
- Tabel baru `pricelist_items` (category text 'ban', brand, type, kategori, pattern, rim int, size, size_key normalisasi digit "1856514", price_grosir/external/heb/retail numeric, vehicle_model, search_text, updated_at). GRANT + RLS: baca untuk peran internal (`is_internal_user`), tulis hanya admin.
- Import di klien via `xlsx` (sudah dipakai di Tire Inventory), lalu RPC SECURITY DEFINER `replace_pricelist(category, rows jsonb)` dalam satu transaksi.
- `src/lib/pricelistSearch.ts`: normalisasi query (hapus spasi/“/”/“-”/“R”, gabung digit) dibandingkan ke size_key + token teks; diberi unit test untuk contoh-contoh di atas.
- Filter & cari dilakukan di klien (data ~1.700 baris, di-cache React Query).
- Komponen: `PricelistHeader`, `PricelistFilterPanel`, `PricelistItemList`, `PricelistCategorySwitch`, `PricelistImportDialog`.
