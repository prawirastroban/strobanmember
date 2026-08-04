# Plan: Perkecil Ukuran & Efek Gelap TrustStrip

## Tujuan
Membuat section mobile "Kenapa pilih Stroban ?" lebih ringkas dan estetik dengan sedikit efek gelap, tanpa mengubah struktur atau konten.

## Perubahan yang Diusulkan

### 1. Ukuran Banner & Tipografi
- Ubah rasio banner dari `aspect-[16/9]` menjadi `aspect-[21/9]` agar tidak terlalu tinggi.
- Perkecil judul dari `text-2xl` menjadi `text-xl` dengan `font-bold` (bukan extrabold).
- Tambahkan `tracking-tight` untuk kesan lebih bersih.

### 2. Efek Gelap
- Naikkan overlay dari `bg-foreground/65` menjadi `bg-foreground/75` agar kontras lebih kuat dan terasa lebih gelap.
- Pertimbangkan menambahkan `backdrop-brightness-75` jika diperlukan, tetapi overlay sudah cukup.

### 3. Ukuran Kartu
- Perkecil padding kartu dari `p-3.5` menjadi `p-3`.
- Perkecil judul kartu dari `text-sm` menjadi `text-[13px]`.
- Perkecil deskripsi tetap `text-[11px]` tetapi dengan `line-clamp-3` agar tidak memanjang.
- Kurangi gap grid dari `gap-3` menjadi `gap-2.5`.

### 4. Spasi Section
- Kurangi margin atas/bawah dari `mt-8 mb-8` menjadi `mt-6 mb-6`.
- Kurangi padding container kartu dari `py-5` menjadi `py-4`.

## File yang Akan Diubah
- `src/components/mobile/home/TrustStrip.tsx`

## Catatan
Tidak ada perubahan data, business logic, atau database. Ini adalah perubahan styling semata.