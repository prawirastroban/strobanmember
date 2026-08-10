# Audit Jarak (Spacing) Antar Section & Kartu

## Temuan (pengukuran preview mobile 394px, home page)
- Antar section home ada pita kosong ganda: `mt-8` + `mb-8` (32px + 32px), sehingga muncul area gelap ~64px antara "Kenapa pilih Stroban" dan "Bagaimana cara booking".
- Banner judul section (TrustStrip & HowToBook) memakai rasio 16:9 penuh (~220px) hanya untuk satu baris judul — boros ruang.
- Grid kategori layanan memakai `marginTop: 12` + `padding: 16px 0 14px`, lalu VoucherClaimCard punya jarak sendiri, membuat celah tidak konsisten dengan jarak hero → searchbar.
- Blok "Bagaimana cara booking" tinggi 817px dengan `py-4` per baris — terasa renggang.
- Skala jarak tidak seragam: campuran nilai inline px (12/14/16) dan util Tailwind (mt-8/mb-8/py-5).

## Perubahan
1. **Skala jarak seragam untuk home mobile**: satu ritme vertikal — jarak antar section 20px, padding dalam section 16px, jarak antar kartu 10–12px. Hapus penumpukan `mt-8` + `mb-8` (cukup satu sisi).
2. **Banner judul section lebih ringkas**: turunkan tinggi banner TrustStrip & HowToBook dari 16:9 ke tinggi tetap ≈120–140px agar judul tidak mengambang di area kosong besar.
3. **Rapatkan grid kategori ↔ voucher**: samakan padding horizontal 12px, jarak grid → voucher 12px, hilangkan padding bawah ganda.
4. **Padatkan daftar "Bagaimana cara booking"**: `py-4` menjadi `py-3` dan rapatkan deskripsi, tanpa mengorbankan keterbacaan.
5. **Konsistensi kartu**: radius dan padding kartu (TrustStrip, Voucher, kategori) diseragamkan (radius 16, padding 12–14px).
6. **Audit halaman lain dengan aturan sama** (hanya jarak, bukan konten): Katalog, Profile, Booking, MyBooking, Cabang, Promo — rapikan kartu dengan padding/margin berlebih atau area kosong besar antar blok.

## Yang tidak berubah
- Konten, teks, urutan section, data dari database, dan seluruh logika/backend.
- Warna, token desain, dan gaya glass/neon.

## Catatan teknis
- File utama: `src/components/mobile/home/ServiceCategoryGrid.tsx`, `VoucherClaimCard.tsx`, `TrustStrip.tsx`, `HowToBook.tsx`, `HomeBannerSlider.tsx`, `HeroBookingForm.tsx`, serta wrapper di `src/pages/Index.tsx`.
- Verifikasi via screenshot Playwright 394x686 dan 430px, plus pengukuran `getBoundingClientRect` antar section untuk memastikan gap konsisten.