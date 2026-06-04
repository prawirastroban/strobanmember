# Audit PWA — Sahabat Stroban Service

> **Status: PLANNING ONLY**. Tidak ada perubahan kode, database, atau deployment yang dilakukan. Laporan ini hanya hasil audit + rekomendasi untuk approval.

---

## A. Kondisi Saat Ini

Hasil pemindaian repo:

| Komponen | Status | Catatan |
|---|---|---|
| `public/manifest.webmanifest` | ✅ Ada | `name`, `short_name`, `display: standalone`, `theme_color #E53935`, `start_url /`, ikon 192/512 + maskable |
| `<link rel="manifest">` di `index.html` | ✅ Ada | Sudah ter-link |
| Icon PWA | ⚠️ Sebagian | `pwa-192x192.png`, `pwa-512x512.png`, `favicon.png` ada. **Tidak ada** icon iOS khusus (180×180), tidak ada splash iOS, tidak ada maskable terpisah, tidak ada monochrome icon |
| Service Worker (app-shell) | ❌ Tidak ada | `vite-plugin-pwa` **terinstal di package.json** tetapi **tidak dikonfigurasi** di `vite.config.ts`, tidak ada `registerSW`, tidak ada `public/sw.js`. PWA tidak akan ter-install secara reliable di Android tanpa SW |
| Service Worker (push) | ✅ Ada | `public/firebase-messaging-sw.js` aktif untuk FCM web push (terpisah dari app-shell) |
| Web Push (FCM) | ✅ Ready | `useWebPush.ts` hardcoded config + VAPID, `dispatch-notification` edge function, tabel `push_tokens` |
| Native Push (Capacitor) | ✅ Ready | `usePushNotifications.ts`, `capacitor.config.ts` ada |
| Meta tag iOS | ⚠️ Sebagian | `apple-mobile-web-app-capable`, `status-bar-style`, `apple-touch-icon → /pwa-192x192.png` (seharusnya 180×180) — splash screens iOS belum ada |
| Theme color | ✅ `#E53935` |  |
| `og-image`, SEO, JSON-LD | ✅ Lengkap | Tidak akan terdampak PWA |
| Mobile nav | ✅ Ada | `BottomNav`, `MobileNav`, `MobileBookingWizard`, `MobileHero` |

---

## B. Skor Kesiapan PWA

| Kategori | Skor | Alasan |
|---|---:|---|
| Manifest | 85 | Lengkap; kurang `id`, `scope`, `orientation`, `categories`, `screenshots`, `shortcuts` |
| Service Worker (app-shell) | 0 | Belum ada registrasi sama sekali |
| App Icon | 60 | 192/512 ada, maskable ada; belum ada 180×180 iOS, monochrome, adaptive Android |
| Splash Screen | 20 | Hanya theme_color/background fallback Android; iOS splash belum ada |
| Offline Support | 0 | Belum ada caching |
| Push Notification Readiness | 80 | Web (FCM) + Native (Capacitor) infra sudah jalan; tinggal UX install/permission |
| Mobile Navigation | 85 | Bottom nav + mobile wizard sudah baik |
| Mobile UX | 75 | Sudah responsif, tapi perlu audit visual per-halaman (lihat §D) |
| Mobile Performance | 70 | Sourcemap off, Vite build modern; perlu lazy-load chunk + cek Lighthouse |
| **Rata-rata** | **≈ 53** | Setara "installable belum siap, infrastruktur sudah 70% jalan" |

---

## C. Gap Analysis (yang menghalangi "Install Sahabat Stroban")

1. **Service worker app-shell belum register.** Chrome Android baru menampilkan banner *Install* jika manifest valid **DAN** SW aktif yang men-cache minimal start_url. Saat ini SW belum ada → install prompt tidak akan muncul otomatis.
2. **Icon iOS 180×180** belum ada → ikon home-screen iPhone akan blur / fallback screenshot.
3. **iOS splash screens** (untuk berbagai resolusi iPhone) belum ada → flash putih saat launch.
4. **`scope` & `id`** belum ada di manifest → risiko duplicate install entry saat field lain berubah di masa depan.
5. **Shortcuts manifest** (mis. Booking, Progress, Riwayat) belum ada → UX install kurang "native".
6. **Tidak ada strategi cache HTML** → harus `NetworkFirst` agar tidak membekukan booking flow live.
7. **OAuth callback (`/~oauth`, `/auth/callback`)** harus dikecualikan dari SW navigation fallback agar login Google tidak rusak.
8. **Preview Lovable harus di-guard** — SW tidak boleh terdaftar di iframe / `*.lovableproject.com` / dev.
9. **`@capacitor/*` masih terpasang** — ini OK, tetapi web build tidak boleh ikut me-register SW Capacitor; perlu pastikan tidak terjadi double-SW.

---

## D. Risiko Implementasi (terhadap customer live)

| Risiko | Dampak | Mitigasi |
|---|---|---|
| SW caching HTML cache-first → user lihat versi lama booking | **Tinggi** | Wajib `NetworkFirst` untuk navigations, `autoUpdate`, `skipWaiting` |
| SW menyebabkan white-screen pasca deploy | Tinggi | Sediakan kill-switch `?sw=off` + same-path replacement worker |
| Konflik dengan `firebase-messaging-sw.js` | Sedang | Path & scope berbeda (`/sw.js` vs `/firebase-messaging-sw.js`) — aman selama tidak menghapus cache lintas scope |
| OAuth Google rusak karena SW intercept `/~oauth` & `/auth/callback` | Tinggi | Exclude dari `navigateFallbackDenylist` |
| Midtrans redirect / Snap popup dianggap navigasi cached | Tinggi | Exclude domain Midtrans + path callback pembayaran |
| iOS user "install" lalu app stuck di versi lama | Sedang | `registerType: autoUpdate` + revalidasi HTML |
| Lovable preview register SW lalu macet | Sedang | Guard registrasi dengan whitelist hostname production saja |
| SEO drop karena SW salah caching | Rendah-sedang | Tidak cache `text/html` bot routes; manifest tidak mengubah SSR/markup |
| Customer existing prompt "install" sebelum siap | Rendah | Banner install dipasang behind feature flag bertahap |

---

## E. Rekomendasi Arsitektur

1. **Tipe PWA**: *Installable + light offline shell* (bukan full offline). Booking & payment **tetap online-only**.
2. **Tooling**: gunakan `vite-plugin-pwa` (sudah terpasang) dengan strategi `generateSW`, `registerType: "autoUpdate"`, `injectRegister: null`.
3. **Wrapper registrasi tunggal** `src/pwa/register.ts` dengan guard:
   - hanya jalan di `import.meta.env.PROD`
   - bukan dalam iframe
   - hostname bukan `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`, `id-preview--*`, `preview--*`
   - URL tidak mengandung `?sw=off` (kill switch)
4. **Strategi cache**:
   - HTML / navigations → `NetworkFirst` (timeout 3s)
   - Same-origin hashed assets (`/assets/*`) → `CacheFirst`
   - Gambar Supabase storage → `StaleWhileRevalidate` (kuota terbatas)
   - **Denylist**: `/~oauth`, `/auth/callback`, `/api/`, semua call `supabase.co`, semua call `midtrans`
5. **Manifest tambahan**: `id: "/"`, `scope: "/"`, `orientation: "portrait"`, `categories: ["automotive","business"]`, `shortcuts` (Booking, Progress, Riwayat, Promo), `screenshots` (untuk Android install dialog yang lebih kaya).
6. **Icon set baru** (assets diproduksi terpisah, **tidak menyentuh UI**):
   - `icon-180.png` (apple-touch-icon)
   - `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `icon-monochrome.svg`
   - Splash iOS minimal: 1290×2796, 1179×2556, 1170×2532, 828×1792, 750×1334
7. **Install UX**:
   - Custom banner "Install Sahabat Stroban" yang muncul *setelah* user login + minimal 1 booking, mendengarkan `beforeinstallprompt`.
   - Untuk iOS: instruksi modal "Tambahkan ke Layar Utama" (iOS tidak punya event install).
8. **Capacitor**: tetap dipertahankan untuk Play Store build masa depan; web build tidak menjalankan Capacitor plugin.
9. **Push Notification provider**: **lanjutkan dengan FCM (sudah jalan)**. OneSignal/native browser push **tidak direkomendasikan** karena duplikasi infra (lihat §G.4).
10. **QR Check-in**: tambah halaman `/dashboard/checkin` (scanner kamera) yang baca QR booking yang sudah ada → update `bookings.checked_in_at`. **Tanpa mengubah skema lama**, hanya kolom baru (opsional, fase 3).

---

## F. Estimasi Tahapan Implementasi

**Fase 0 — Persiapan (tanpa ship)**
- Generate icon set + splash iOS
- Setup branch staging terpisah
- Siapkan kill-switch SW

**Fase 1 — Installability dasar (low risk)**
- Update manifest (`id`, `scope`, `orientation`, `shortcuts`, `screenshots`)
- Tambah icon iOS 180 + apple meta lengkap
- Tambah splash iOS
- *Belum* register SW
- **Hasil**: iPhone bisa "Add to Home Screen" dengan icon & splash benar; Android belum dapat banner install otomatis tapi sudah bisa via menu browser.

**Fase 2 — Service Worker + offline shell**
- Konfigurasi `vite-plugin-pwa` (generateSW, NetworkFirst, denylist)
- Wrapper registrasi dengan guard preview & kill-switch
- QA di staging: booking, login Google, Midtrans, push, reset password
- Rollout bertahap (publish + monitor 48 jam)
- **Hasil**: Banner *Install* muncul di Chrome Android; offline fallback ringan; app terasa native.

**Fase 3 — Install UX + QR Check-in**
- Banner custom install (gated feature flag)
- iOS install instructions modal
- QR Scanner di dashboard cabang
- Migration tambahan kolom `checked_in_at` + RLS staff
- **Hasil**: Conversion install lebih tinggi + operasional cabang lebih cepat.

**Fase 4 — Polish**
- Lighthouse PWA ≥ 95
- Audit performance per route (lazy load)
- Add to Home Screen analytics
- Persiapan TWA / Play Store (opsional)

---

## G. Audit Detail per Pertanyaan

### G.1 Mobile Experience (per halaman)
Audit perlu dilakukan langsung di preview mobile (390×844 & 360×800). Berdasarkan pembacaan komponen:

- **Homepage** (`Index` + `MobileHero`, `PopularServices`, `ServiceCategoryGrid`, `TrustStrip`, `BottomCTA`): struktur mobile sudah ada — risiko: hero h-120px sudah compressed, OK.
- **Booking** (`MobileBookingWizard`): wizard mobile-first, OK.
- **Service Progress**: 6-stage tracker realtime, OK.
- **Reminder Service** (`MobileReminderCard`): OK.
- **Katalog**: grid 5-col di desktop, perlu cek stack di 360px.
- **Login/Register** (`Auth`, `LoginDialog`): perlu verifikasi keyboard overlap di iOS.
- **Akun/Profile**: OK.
- **Dashboard Customer**: compressed hero h-120px, OK.

> Audit visual lengkap akan dilakukan via screenshot per route di fase Build (bukan sekarang).

### G.2 Install Experience per browser

| Browser | Behavior saat ini | Setelah Fase 1 | Setelah Fase 2 |
|---|---|---|---|
| Chrome Android | Menu → "Add to Home Screen" manual | Sama | **Banner Install otomatis** + shortcuts + screenshots |
| Samsung Internet | Menu → "Add page to" manual | Sama | Banner install otomatis |
| Safari iPhone | Share → "Add to Home Screen", icon blur | Icon tajam + splash benar | Sama (Safari tidak respect SW untuk banner) |
| Chrome iPhone | Sama dengan Safari (WebKit) | Sama | Sama |

### G.3 Push Notification readiness

Semua event di bawah **sudah memiliki trigger DB + edge function `dispatch-notification`**:
- Booking dikonfirmasi ✅
- Pembayaran berhasil ✅ (via Midtrans webhook)
- Servis dimulai ✅ (status booking)
- Servis selesai ✅
- Reminder service ✅ (`send-service-reminders`)
- Promo marketing ⚠️ belum ada trigger broadcast — perlu UI admin

### G.4 Provider Push

| Provider | Pro | Kontra | Verdict |
|---|---|---|---|
| **FCM (sekarang)** | Sudah jalan, gratis, support Web + Android + iOS via APNs proxy, 1 codebase | Setup VAPID + service account, iOS Safari web push hanya iOS 16.4+ installed PWA | ✅ **Lanjutkan** |
| OneSignal | UI dashboard mudah, segmentasi built-in | Vendor lock-in, biaya scale, duplikasi infra | ❌ Tidak perlu |
| Native Web Push API langsung | Tanpa SDK | Harus handle VAPID manual, tidak unified dengan Capacitor native | ❌ Tidak perlu |

### G.5 QR Check-in
- Setiap booking sudah punya `BookingQRCard` (lihat `src/components/booking/BookingQRCard.tsx`).
- Tambah rute `/dashboard/checkin` dengan scanner (mis. `html5-qrcode`).
- Scanner baca booking_id → call edge function `admin-checkin-booking` → set `bookings.checked_in_at = now()`, log ke `activity_logs`.
- **Tanpa mengubah** booking_status existing (tetap di tracker 6-stage). Hanya menandai kehadiran fisik di cabang.

### G.6 iOS limitations

| Fitur | Android | iOS |
|---|---|---|
| Install banner otomatis | ✅ | ❌ (manual Share menu) |
| Splash screen | dari manifest | **wajib generate per-resolusi** |
| Background sync | ✅ | ❌ |
| Push notification | ✅ (semua versi) | ✅ hanya iOS 16.4+ **dan** sudah di-Add to Home Screen |
| Offline cache | ✅ | ✅ (kuota ~50MB, lebih kecil) |
| Camera/QR | ✅ | ✅ (perlu HTTPS + permission) |
| Storage persistence | ✅ | ⚠️ dibersihkan jika app tidak dibuka 7 hari |

Mitigasi iOS: modal instruksi visual "Tap Share → Add to Home Screen", deteksi `navigator.standalone === false` untuk munculkan reminder.

### G.7 SEO Impact

PWA **tidak menurunkan SEO** bila:
- Manifest hanya menambah meta tag (tidak mengganti markup).
- SW pakai `NetworkFirst` untuk HTML → Googlebot selalu dapat versi fresh.
- `robots.txt` & `sitemap.xml` tidak di-cache lebih dari 1 jam.
- Tidak ada redirect berbasis `display-mode: standalone` untuk bot.
- Manifest justru menambah signal mobile-friendly (PageSpeed Insights bonus).

Risiko hanya muncul jika SW cache-first HTML — yang sudah dilarang dalam arsitektur §E.

---

## H. Estimasi Effort

| Fase | Effort | Catatan |
|---|---|---|
| Fase 0 (assets) | 0.5 hari | Generate icon + splash |
| Fase 1 (manifest + iOS) | 0.5 hari | Murni file statis & meta |
| Fase 2 (SW + guard + QA) | 1.5–2 hari | Termasuk QA Midtrans + OAuth |
| Fase 3 (Install UX + QR Check-in) | 2 hari | Termasuk migration + dashboard |
| Fase 4 (Polish + Lighthouse) | 0.5–1 hari | |
| **Total** | **≈ 4.5–6 hari kerja** | Bisa di-rilis bertahap |

---

## I. Risiko terhadap Customer Existing

| Fase | Risiko ke customer | Tingkat |
|---|---|---|
| Fase 0 | Tidak ada (tidak ship) | – |
| Fase 1 | Tidak ada (hanya meta + ikon) | **Sangat rendah** |
| Fase 2 | SW caching salah, OAuth/Midtrans terinterupsi | **Sedang** — perlu staging QA + kill-switch siap |
| Fase 3 | Migration tambahan kolom (tanpa ubah existing) | Rendah |
| Fase 4 | Tidak ada | – |

**Strategi rollout aman:**
- Setiap fase di-deploy di luar jam sibuk (mis. 22:00–06:00).
- Pantau Sentry / log Supabase 24 jam setelah deploy.
- Kill-switch `?sw=off` selalu siap di public/sw.js untuk roll-back instan.
- Tidak menyentuh: tabel booking, payment flow, auth flow, routing existing, UI komponen existing.

---

## Yang TIDAK akan diubah (kontrak audit)

- ❌ Skema database existing (kecuali penambahan kolom opsional di Fase 3 untuk check-in — akan diminta approval terpisah)
- ❌ Auth flow (Google OAuth, Email, Phone)
- ❌ Booking flow (semua tahap 6-stage)
- ❌ Payment flow (Midtrans + manual + QRIS)
- ❌ Routing existing (semua route lama tetap)
- ❌ Dashboard layout
- ❌ Komponen UI yang sudah ada
- ❌ `firebase-messaging-sw.js` (dipertahankan apa adanya)

---

## Next step

**Menunggu approval Anda** untuk:
1. Menyetujui keseluruhan plan, atau
2. Memilih fase yang ingin dijalankan dulu (rekomendasi: Fase 0 + Fase 1 sebagai langkah aman pertama), atau
3. Minta deep-dive tambahan (mis. audit visual per halaman dengan screenshot).

Tidak ada perubahan kode/db/deploy yang akan dilakukan sampai Anda berkata "lanjut".
