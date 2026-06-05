## Fase 3: Install App Banner

Tampilkan banner promosi install app saat user buka web di browser (Android/iOS/Desktop), dengan logika dismiss yang ramah dan tidak mengganggu.

## Komponen Baru

**`src/components/InstallAppBanner.tsx`** — Banner glassmorphism merah-neon di bagian bawah layar (mobile) / pojok kanan bawah (desktop), pakai `useInstallPrompt()`:

- **Tampil jika**: `show === true` (bukan installed, bukan native Capacitor) DAN belum di-dismiss (cek `localStorage`).
- **Delay**: muncul 5 detik setelah halaman load (tidak langsung pop-up agresif).
- **Android/Desktop** dengan `canPrompt`: tombol "Install App" memanggil `promptInstall()`.
- **iOS Safari** (`isIOS`, no `canPrompt`): tombol "Cara Install" buka dialog instruksi "Tap Share → Add to Home Screen".
- **Tombol close (X)**: simpan `pwa_banner_dismissed_at` ke localStorage → sembunyikan 7 hari.
- **Setelah install** (`appinstalled` event di hook): banner auto-hilang.

Layout:
- Mobile: full-width bottom sheet di atas `BottomNav` (z-index 40, padding-bottom mengikuti safe-area).
- Desktop: floating card 320px di `bottom-4 right-4`.
- Logo app + headline "Install Sahabat Stroban" + subtext "Akses lebih cepat, notifikasi langsung" + CTA + close.

## Integrasi

**`src/App.tsx`** — Mount `<InstallAppBanner />` sekali di root (di dalam `BrowserRouter`, di luar `Routes`), sejajar dengan `<FloatingCartPill />`.

## Hook (tidak diubah)
`useInstallPrompt` sudah cukup; banner cukup pakai `show`, `canPrompt`, `isIOS`, `promptInstall`.

## Halaman yang TIDAK ditampilkan banner
Banner di-skip jika `location.pathname` diawali `/auth`, `/reset-password`, `/payment/manual`, atau `/invoice/` — supaya flow login & pembayaran tidak terganggu.

## Tidak diubah
- Service worker, manifest, vite.config (sudah dari Fase 1 & 2).
- Tombol "Install App" di MobileNav & DesktopSidebar (tetap, sebagai entry point manual).
- Backend, auth, booking, payment.

## Dismissal Policy
- Close (X) → hide 7 hari.
- "Nanti saja" link → hide 7 hari.
- Install sukses → hide permanen (via `appinstalled`).
- Key: `pwa_install_banner_dismissed_at` (timestamp ms).
