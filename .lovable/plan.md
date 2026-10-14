# Perbesar ukuran tabel pricelist ±10%

## Masalah
Pada zoom browser 100% teks tabel pricelist terlalu kecil; baru terasa pas di rasio tampilan 110%. Artinya semua ukuran teks di tabel perlu dinaikkan ±10–15% agar pada zoom 100% terbaca seperti 110% sekarang.

Cakupan: hanya **daftar/tabel pricelist** (semua tab: Ban, Oli, Spareparts, Jasa, Jasa Ban) — desktop dan HP. Panel filter, search bar, dan bilah kategori tidak diubah.

## Perubahan

### `src/pages/Pricelist.tsx`
- Judul kolom (header harga): `text-[10px]` → `text-[11px]`.
- Baris brand (merah, atas): `text-[10px]` → `text-[11px]`.
- Baris kode/satuan (Oli/Spareparts): `text-[10px]` → `text-[11px]`.
- Badge Type & Rim: `text-[9px]` → `text-[10px]`, tinggi `h-3.5` → `h-4`.
- Label harga di HP: `text-[9px]` → `text-[10px]`.
- Angka harga: `text-[11px] sm:text-xs` → `text-xs sm:text-[13px]`.
- Padding atas-bawah baris: `py-1.5` → `py-2` agar teks lebih besar tidak mepet.
- Lebar area harga di desktop ikut ditambah agar teks 13px muat: Oli `w-56` → `w-60`; Sparepart/Jasa Ban `w-80` → `w-[21rem]`; Ban/Jasa `w-[26rem]` → `w-[28rem]`.

### `src/components/pricelist/PricelistItemName.tsx`
- Nama barang: `text-sm` (14px) → `text-[15px]`.
- Keterangan kendaraan: `text-[10px]` → `text-[11px]`.

## Hal yang tetap
- Gaya tabel gaya-Excel: nama kiri, harga kanan rata tengah, garis tepi membulat, baris ramping.
- Filter, search bar, bilah kategori, dan per-formingan tab Jasa (toggle Service/Ban) tidak berubah.
- Deteksi overflow `PricelistItemName` tetap bekerja (ResizeObserver mengukur ulang otomatis setelah ukuran teks berubah).

## Verifikasi
- Playwright: cek keempat tab di desktop (1280px) dan HP (mobile viewport) — teks terbaca lebih besar, tidak ada harga/nama terpotong, badge tidak tumpang tindih.
- Perbarui file memori `mem://ux/pricelist-filter-autohide` agar angka ukuran baris/badge sesuai ukuran baru.
