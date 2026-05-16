## Tujuan

Kecilkan dan rapatkan section `Testimonials` di mobile tanpa mengubah tampilan desktop (≥md). Hanya class Tailwind responsif — tidak ada perubahan logika, data, atau auto-scroll.

## Perubahan di `src/components/Testimonials.tsx`

### Header (judul + rating)
- Eyebrow "ULASAN PELANGGAN": `text-[10px] md:text-xs` + `mb-1 md:mb-2`.
- Judul `h2`: `text-xl md:text-3xl lg:text-4xl` (saat ini `text-3xl md:text-4xl`).
- Subtitle: `text-xs md:text-base`, `mt-1 md:mt-2`.
- Margin bawah header: `mb-4 md:mb-6` (saat ini `mb-6`).
- Baris rating:
  - Wrapper: `gap-2 md:gap-3`, `mt-3 md:mt-5`.
  - Ikon bintang: `h-4 w-4 md:h-5 md:w-5`.
  - "4.9": `text-base md:text-lg`.
  - "berdasarkan 1.200+ ulasan": `text-xs md:text-sm`.

### Kontainer carousel
- Tinggi: `h-[360px] md:h-[480px]` (saat ini fix `h-[480px]`).
- Gap antar kartu: `gap-3 md:gap-4`.
- Padding vertikal: `py-2 md:py-4`.
- Fade gradient atas/bawah: `h-8 md:h-12`.

### Kartu testimoni
- Radius/padding: `rounded-xl md:rounded-2xl`, `p-3 md:p-4`.
- Ikon kutip: `h-5 w-5 md:h-7 md:w-7`.
- Badge "Verified": tambahkan `text-[9px] md:text-[10px]` dan `px-1.5 md:px-2`.
- Kutipan: `text-[13px] md:text-sm`, `mb-3 md:mb-5`, `line-clamp-3 md:line-clamp-4`.
- Baris rating + tanggal: `mb-3 md:mb-4`; ikon bintang di `StarRating` tetap (sudah `h-4 w-4`), aman.
- Footer kartu: `pt-3 md:pt-4`, `gap-2 md:gap-3`.
- Avatar: `h-8 w-8 md:h-10 md:w-10`, `text-xs md:text-sm`.
- Nama: `text-xs md:text-sm`.
- Service & lokasi: tetap `text-xs` / `text-[11px]` (sudah kecil).

### Section padding
- Section: `py-4 md:py-10` (saat ini `py-6 md:py-10`) supaya jarak ke atas/bawah lebih pas di mobile.

## Tidak diubah

- `src/pages/Index.tsx`, fetch `public_reviews`, fallback list, animasi framer-motion, auto-scroll, i18n strings, schema DB.

## Verifikasi

1. Viewport 390×844: header lebih kompak, kartu lebih kecil, marquee tetap auto-scroll & pause-on-touch, tidak ada teks terpotong aneh.
2. Viewport ≥768px / ≥1024px: tampilan identik dengan sebelumnya (karena semua override pakai prefix `md:` / `lg:`).
