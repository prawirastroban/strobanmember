## Masalah

Di mobile, section testimoni saat ini memakai `MiniTestimonials` yang hanya menampilkan 3 kartu statis tanpa auto-scroll, sangat berbeda dengan versi web (`Testimonials.tsx`) yang sudah punya:

- Header: eyebrow "ULASAN PELANGGAN", judul "Apa Kata **Pelanggan Kami**", subtitle, dan baris rating bintang 4.9 + "berdasarkan 1.200+ ulasan".
- Kartu glass dengan ikon kutip, badge "Verified" untuk review asli, rating bintang, tanggal, avatar inisial, nama, layanan, lokasi/kendaraan.
- Marquee vertikal auto-scroll (35 px/s) dengan loop mulus (list digandakan), fade gradient atas/bawah, pause saat hover/touch.
- Data live dari view `public_reviews` (limit 20) + fallback list bila <6 review.

Screenshot referensi memperlihatkan tampilan inilah yang diinginkan di mobile.

## Tujuan

Mobile menampilkan section testimoni dengan layout, isi, dan perilaku (auto-scroll, pause-on-touch, fade gradient, real reviews + fallback) yang identik dengan versi web.

## Perubahan

### 1. `src/pages/Index.tsx`

- Pakai `<Testimonials />` untuk mobile **dan** desktop, hapus pemakaian `<MiniTestimonials />`.
- Hapus import `MiniTestimonials`.
- Pindahkan `<Testimonials />` keluar dari wrapper `hidden lg:block` agar tampil di semua viewport. Susunan baru:
  - Mobile block (`lg:hidden`): Hero booking → ServiceCategoryGrid → HeroBookingForm(form) → VoucherClaimCard → PopularServices → TrustStrip → `<Testimonials />`.
  - Desktop block (`hidden lg:block`) tetap menampilkan `<Testimonials />` di posisi sekarang untuk guest, dan tidak diduplikasi di mobile.
  - Solusi paling bersih: render `<Testimonials />` **satu kali** di luar dua wrapper (tanpa class `hidden`) supaya muncul di mobile + desktop, lalu hilangkan duplikat di blok desktop guest. Tetap muncul untuk guest dan user (sama seperti web saat ini hanya guest; ikut keputusan: tampilkan ke semua sesuai screenshot karena MiniTestimonials sebelumnya juga selalu tampil ke semua user di mobile).

### 2. `src/components/Testimonials.tsx` — penyesuaian kecil untuk mobile

Komponen sudah responsif (`py-6 md:py-10`, `max-w-2xl mx-auto`, `h-[480px]`). Verifikasi kelas mobile:

- Pastikan padding horizontal cukup di layar 390px (sudah ada `container mx-auto px-4`).
- Tidak perlu ubah tinggi (480px) — sama seperti screenshot.
- Tidak ada perubahan fungsional pada auto-scroll, data fetch, atau fallback.

(Tidak diperlukan perubahan kode jika rendering mobile sudah benar; cek visual saat verifikasi.)

### 3. `src/components/mobile/home/MiniTestimonials.tsx`

- Hapus file ini setelah tidak ada importer.

### 4. Tidak diubah

- `Testimonials.tsx` logika auto-scroll, fetch `public_reviews`, fallback list, i18n strings (`t.testimonials.*` dari `src/i18n/id.ts` / `en.ts`).
- Schema DB / RLS / view `public_reviews`.
- Komponen mobile lain.

## Verifikasi

1. Buka `/` di viewport 390×844: section testimoni harus menampilkan header "ULASAN PELANGGAN / Apa Kata **Pelanggan Kami**", baris rating, lalu kartu-kartu yang auto-scroll ke bawah dan loop mulus.
2. Sentuh kartu → scroll berhenti; lepas → lanjut.
3. Di desktop ≥1024px: tampilan tetap seperti sebelumnya, tidak ada section ganda.
4. Tidak ada error import (`MiniTestimonials`) di build.
