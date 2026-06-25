## Masalah

Pada Android (Capacitor, edge-to-edge aktif), judul "Katalog Layanan" dan elemen header lain bertumpuk dengan status bar. Penyebabnya: spacer offset navbar di `src/components/Navbar.tsx:148-152` memakai `className="h-14"` (tinggi tetap 56px) dan menambahkan `paddingTop: env(safe-area-inset-top)` *di dalam* kotak tinggi-tetap tersebut. Padding di dalam elemen `h-14` tidak menambah tinggi — sehingga spacer tetap 56px sementara navbar fixed sebenarnya setinggi `56px + safe-area-inset-top`. Akibatnya, konten halaman naik ke belakang status bar.

## Perbaikan

1. **`src/components/Navbar.tsx` (spacer)** — ganti `h-14` + padding menjadi tinggi yang benar-benar tumbuh mengikuti safe-area:
   ```tsx
   <div
     aria-hidden
     style={{ height: "calc(3.5rem + env(safe-area-inset-top))" }}
   />
   ```
   Navbar fixed-nya sudah benar (padding-top safe-area + inner `h-14`), tidak diubah.

2. **`src/index.css`** — pastikan token `--header-height` mencerminkan tinggi nyata navbar termasuk safe-area, supaya class `.page-with-header` (line 1417) dan `scroll-margin-top` (line 1440) konsisten. Tambahkan variabel global:
   ```css
   :root { --header-height: 3.5rem; }
   ```
   (sudah ada — verifikasi nilainya 3.5rem; tidak perlu rumus tambahan karena `calc(var(--header-height) + env(safe-area-inset-top))` sudah benar di line 1417/1440).

3. **`src/pages/Katalog.tsx`** — `<main>` memakai `pt-6 lg:pt-10`. Karena offset utama sudah ditangani oleh spacer Navbar yang diperbaiki di langkah 1, tidak ada perubahan lain yang dibutuhkan untuk Katalog. Cek visual setelah build.

4. **Audit cepat pages lain** — telusuri pemakaian pola `h-14` + `paddingTop: env(safe-area-inset-top)` di komponen lain (`MobileNav`, halaman dashboard, dll.) dan terapkan pola yang sama bila ada. Berdasarkan grep, hanya `Navbar.tsx` yang terdampak.

## Validasi

- Jalankan Playwright dengan viewport mobile + emulasikan `env(safe-area-inset-top: 32px)` via CSS injection, screenshot halaman `/katalog` untuk memastikan judul tidak lagi tertutup.
- Periksa juga halaman beranda (`/`) mobile agar Navbar tidak menambahkan jarak ganda.

## Catatan

- Tidak ada perubahan logika / data.
- Tidak ada perubahan pada CookieConsentBanner (sudah diperbaiki sebelumnya).
- Setelah merge, jalankan `npm run build && npx cap sync android` lalu rebuild APK untuk melihat hasilnya di device.
