# Fase 2: Service Worker + Auto-Update PWA

## Tujuan
Setelah user "Install App" ke home screen, setiap kali tim publish versi baru, **aplikasi yang sudah terpasang otomatis update** tanpa perlu uninstall/reinstall. Sekaligus memberi **offline app-shell** ringan (halaman utama tetap bisa dibuka saat sinyal hilang).

## Strategi Teknis (sesuai PWA Skill)

Pakai **`vite-plugin-pwa`** (bukan SW hand-written) dengan mode `generateSW` + `registerType: "autoUpdate"`. Ini standar paling aman dan kompatibel dengan Lovable preview.

### Aturan kritis yang akan dipatuhi
- **Tidak register SW** di Lovable preview, iframe, dev mode, atau saat URL berisi `?sw=off` (kill-switch).
- **HTML navigations pakai `NetworkFirst`** (bukan cache-first) → user selalu dapat HTML terbaru, anti-stale.
- **Hashed assets pakai `CacheFirst`** (JS/CSS/gambar dengan hash di nama).
- **Exclude `/~oauth`** dari navigation fallback (penting untuk Supabase OAuth callback).
- **Jangan sentuh** `public/firebase-messaging-sw.js` — itu worker push notification terpisah, scope berbeda, tetap berfungsi.

## Perubahan File

### 1. Install dependency
```
bun add -D vite-plugin-pwa workbox-window
```

### 2. `vite.config.ts` (edit)
Tambah `VitePWA` plugin:
- `registerType: "autoUpdate"`
- `injectRegister: null` (kita pakai wrapper sendiri)
- `devOptions: { enabled: false }` (jangan emit SW di dev)
- `filename: "sw.js"`
- `workbox`:
  - `navigateFallback: "/index.html"`, `navigateFallbackDenylist: [/^\/~oauth/, /^\/api/]`
  - `runtimeCaching`:
    - HTML navigations → `NetworkFirst` (timeout 3s, max 10 entries, 1 hari)
    - same-origin hashed JS/CSS → `CacheFirst` (30 hari)
    - images same-origin → `CacheFirst` (30 hari)
    - Supabase REST/storage → `NetworkFirst` (timeout 5s, 1 jam)
  - `cleanupOutdatedCaches: true`
  - `skipWaiting: true`, `clientsClaim: true` ← ini kunci auto-update

### 3. `src/pwa/registerSW.ts` (baru — wrapper registrasi)
Hook ini WAJIB menolak registrasi di kondisi berikut (lalu unregister SW lama):
- `!import.meta.env.PROD`
- dalam iframe (`window.self !== window.top`)
- hostname `id-preview--*`, `preview--*`, `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`
- URL `?sw=off`

Jika lolos guard, register `/sw.js` lalu pasang listener auto-update:
- Saat `controllerchange` terjadi → set flag → reload halaman (`window.location.reload()`)
- Saat plugin trigger `onNeedRefresh` → langsung `updateSW(true)` (karena `autoUpdate` + `skipWaiting`)
- Polling update tiap 60 menit (`registration.update()`) untuk app yang dibiarkan terbuka berjam-jam

### 4. `src/main.tsx` (edit minor)
Tambah satu import: `import "./pwa/registerSW";` di paling bawah. Hanya 1 baris.

### 5. `index.html` (tidak diubah)
Manifest, icon, splash sudah lengkap dari Fase 1.

## Behavior Setelah Deploy

| Kondisi | Hasil |
|---|---|
| User pertama kali buka setelah publish | HTML dapat versi baru via `NetworkFirst`. SW baru ter-download di background. |
| User punya app terpasang, buka app | Service worker `autoUpdate` cek versi baru → install di background → `skipWaiting` aktif → halaman auto-reload sekali → user lihat versi terbaru tanpa interaksi. |
| User app tetap terbuka berjam-jam | Polling 60 menit → kalau ada versi baru → reload otomatis. |
| User offline | App-shell + halaman terakhir yang dikunjungi tetap bisa dibuka (read-only). |
| Lovable preview / dev | SW **tidak** ter-register sama sekali. |
| Push notification (FCM) | Tetap jalan via `firebase-messaging-sw.js` yang terpisah. |

## Risiko terhadap Customer Existing

| Risiko | Mitigasi |
|---|---|
| Stale cache setelah publish | Dicegah: `NetworkFirst` untuk HTML + `cleanupOutdatedCaches` + `skipWaiting`. |
| White screen / stuck SW | Dicegah: kill-switch `?sw=off` siap dipakai jika darurat. |
| Bentrok dengan FCM SW | Tidak bentrok: file & scope berbeda (`/sw.js` vs `/firebase-messaging-sw.js`). |
| Booking/payment terganggu | API Supabase pakai `NetworkFirst` 5s timeout, fallback langsung ke jaringan. Tidak ada caching mutation. |
| OAuth callback gagal | `/~oauth` di-exclude dari navigation fallback. |
| User di tengah transaksi tiba-tiba reload | Reload hanya terjadi saat `controllerchange` (baru ada SW versi baru aktif), jarang & tidak di tengah fetch aktif. Bisa ditambah guard "tunggu sampai idle" jika user mau ekstra hati-hati. |

## Estimasi
- Implementasi: ~20 menit
- File berubah: 3 baru/edit (`vite.config.ts`, `src/pwa/registerSW.ts`, `src/main.tsx`)
- Build size: +~15KB (workbox runtime)

## Tidak Diubah
- Tidak edit booking, payment, auth, edge functions, DB.
- Tidak edit `firebase-messaging-sw.js`.
- Tidak edit Navbar/Sidebar (Fase 1 install button tetap).

## Pertanyaan Opsional (boleh skip)
1. Mau tambah toast kecil "✨ Aplikasi diperbarui" 1 detik sebelum reload? (default: silent reload)
2. Mau saya tambah delay reload sampai user idle (tidak sedang isi form)? (default: reload langsung saat versi baru aktif)

Setujui untuk implementasi?
