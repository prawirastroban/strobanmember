# Android Build Guide — Stroban

Panduan membuat **Android App Bundle (`.aab`)** Stroban untuk Google Play Store.

## App Identity

| Field | Value |
|---|---|
| App Name | **Stroban** |
| Package Name | **com.bengkelstroban.app** |
| Environment | Production |
| versionName | dari `APP_VERSION` (mis. `2026.0115.1430`) |
| versionCode | dari `APP_BUILD_NUMBER` (integer monotonic) |

## Prasyarat (di mesin lokal)

- Node.js 18+
- JDK 17
- Android Studio (Hedgehog / Iguana) + Android SDK 34
- Akun Google Play Console

> Folder `/android` **tidak ada di repo** — di-generate sekali di mesin lokal lewat `npx cap add android`.

## Langkah Build

```bash
# 1. Sinkron kode terbaru
git pull
npm install

# 2. Build web bundle produksi ke /dist
npm run build

# 3. (Sekali saja) generate folder /android
npx cap add android

# 4. Sinkron versionName/versionCode + assets ke Android project
npm run android:sync

# 4b. (Sekali setelah ganti logo) generate semua launcher icon density
#     dari /resources/icon*.png ke android/app/src/main/res/mipmap-*
npm run android:icons

# 5. Buka Android Studio
npm run android:open

# 6. Di Android Studio:
#    Build > Generate Signed Bundle / APK
#    → pilih "Android App Bundle"
#    → pilih keystore release (lihat bagian Keystore)
#    → Build variant: release
#    Output: android/app/release/app-release.aab
```

Setiap rilis berikutnya: ulangi langkah 1, 2, 4, 5, 6.

## Firebase (FCM) Setup

Project Firebase yang dipakai web/PWA dipakai juga oleh Android.

| Field | Value |
|---|---|
| Firebase Project ID | **bengkel-stroban** |
| Messaging Sender ID | 447666256502 |
| Web App ID | 1:447666256502:web:e3a2b0a308b468d09cbd57 |

### Daftarkan Android App di Firebase Console

1. Firebase Console → Project **bengkel-stroban** → ⚙️ → *Project settings* → *Your apps* → **Add app** → Android.
2. Android package name: `com.bengkelstroban.app`
3. App nickname: `Stroban Android`
4. **SHA-1 & SHA-256** — generate dari mesin lokal:

   **Debug keystore** (untuk pengujian):
   ```bash
   keytool -list -v \
     -keystore ~/.android/debug.keystore \
     -alias androiddebugkey \
     -storepass android -keypass android
   ```

   **Release keystore** (untuk Play Store):
   ```bash
   keytool -list -v \
     -keystore /path/ke/release.keystore \
     -alias <alias-anda>
   ```

   Tambahkan **kedua** fingerprint (SHA-1 & SHA-256) untuk debug **dan** release di Firebase Console.

5. Download **`google-services.json`** → letakkan di:
   ```
   android/app/google-services.json
   ```
6. Jalankan ulang `npm run android:sync`.

### Play App Signing (penting)

Setelah upload AAB pertama ke Play Console, Google mengelola signing key sendiri dan akan memberikan **SHA-1 / SHA-256 resmi** di:

`Play Console → Setup → App signing`

Tambahkan **fingerprint dari Play Console** ke Firebase Console juga, jika tidak FCM/Google Sign-In gagal di build dari Play Store.

## Release Keystore (sekali saja)

```bash
keytool -genkey -v \
  -keystore stroban-release.keystore \
  -alias stroban \
  -keyalg RSA -keysize 2048 -validity 10000
```

Simpan keystore + password di tempat aman (1Password, brankas). **Kehilangan keystore = tidak bisa update app di Play Store.**

## Quality Control Checklist

- [ ] `capacitor.config.ts` **tidak** mengandung `server.url` (kalau ada → app load preview Lovable, white screen di Play Store)
- [ ] `npm run build` sukses dan `dist/index.html` ada sebelum `cap sync`
- [ ] `google-services.json` ada di `android/app/`
- [ ] versionCode di Play Console **selalu lebih besar** dari rilis sebelumnya (otomatis via `android:sync`)
- [ ] Test di device fisik: login WhatsApp OTP, push notification, booking, tracking, loyalty, referral, reports, force refresh, offline page
- [ ] Tidak ada error di `adb logcat | grep -i capacitor`

## Modul yang dipakai di Android (sudah terkonfigurasi)

| Plugin | Fungsi |
|---|---|
| `@capacitor/core`, `cli`, `android` | Runtime Capacitor |
| `@capacitor/push-notifications` | APNs/FCM token registration |
| `@capacitor-firebase/messaging` | Upgrade native token → FCM token (HTTP v1) |
| `@capacitor/share` | Share sheet Android |

## Troubleshooting

| Gejala | Penyebab | Fix |
|---|---|---|
| White screen saat app dibuka | `server.url` masih ada / `dist/` kosong | Hapus `server.url`, `npm run build`, `npm run android:sync` |
| Push notification tidak diterima | `google-services.json` tidak ter-update / SHA salah | Re-download dari Firebase Console, taruh di `android/app/`, sync ulang |
| Login loop | FCM token gagal terdaftar | Cek `adb logcat` untuk error `register-push-token`; pastikan paket `com.bengkelstroban.app` terdaftar di Firebase |
| Crash startup | versionCode konflik / signing salah | Pastikan `android:sync` jalan sebelum build, keystore release benar |
| Routing error (404 di tab dalam app) | Capacitor tidak handle deep link | Default scheme `https` sudah benar; jangan override `androidScheme` |
| Google login membuka 404 `/~oauth/initiate` | OAuth dijalankan di origin WebView, bukan domain web | Pull kode terbaru, build ulang, `npm run android:sync`, lalu pastikan intent-filter login Google di bawah sudah ada di AndroidManifest |
| Setelah login Google tidak kembali ke aplikasi | Deep link AndroidManifest belum cocok / APK belum rebuild | Tambahkan semua intent-filter login Google di bawah, lalu build ulang APK/AAB dari source terbaru |

### Google Sign-In di Android

Login Google di Android sekarang memakai **Google Sign-In SDK native** (plugin
`@codetrix-studio/capacitor-google-auth`). Tidak ada lagi Chrome Custom Tabs,
tidak ada halaman web antara, tidak ada deep link OAuth. Flow:

```
Tap Login Google
  → Sistem Android menampilkan Account Picker native
  → Plugin mengembalikan ID token Google
  → supabase.auth.signInWithIdToken({ provider:'google', token })
  → Session siap, app navigate ke halaman terakhir
```

#### Setup wajib sebelum build APK/AAB

1. **Ambil Web Client ID** dari Firebase Console:
   - Project `bengkel-stroban` → Authentication → Sign-in method → Google →
     bagian **Web SDK configuration** → **Web client ID**.
   - Bentuknya: `447666256502-xxxxxxxxxxxx.apps.googleusercontent.com`.
2. **Tempel ke `capacitor.config.ts`** pada blok `plugins.GoogleAuth.serverClientId`,
   menggantikan string `REPLACE_WITH_FIREBASE_WEB_CLIENT_ID...`.
3. **Pastikan SHA-1 debug & release** sudah terdaftar di Firebase Console
   (Project settings → Your apps → Stroban Android → SHA certificate fingerprints).
   Tambahkan juga SHA-1 dari **Play App Signing** setelah upload AAB pertama.
4. **`google-services.json` harus terbaru** — download ulang dari Firebase
   Console setiap kali menambah SHA, letakkan di `android/app/google-services.json`.
5. `npm run build && npm run android:sync` lalu rebuild AAB.

> Tanpa langkah 1–4, plugin akan return error `10` (`DEVELOPER_ERROR`) dan
> login Google gagal di device.

#### Intent-filter OAuth lama (HAPUS)

Jika `AndroidManifest.xml` lokal masih memiliki intent-filter berikut dari
iterasi sebelumnya, **hapus semuanya** karena tidak lagi dipakai dan dapat
mengintersepsi navigasi yang tidak diinginkan:

```xml
<!-- HAPUS — tidak dipakai lagi setelah migrasi ke native Google Sign-In -->
<intent-filter>
  <data android:scheme="com.bengkelstroban.app" android:host="auth" android:path="/callback" />
</intent-filter>
<intent-filter>
  <data android:scheme="com.bengkelstroban.app" android:host="auth-callback" />
</intent-filter>
<intent-filter android:autoVerify="true">
  <data android:scheme="https" android:host="www.bengkelstroban.com" android:path="/auth/native-callback" />
</intent-filter>
```

File `public/.well-known/assetlinks.json` boleh dipertahankan untuk
keperluan App Link di masa depan, tapi tidak lagi wajib untuk login.

Setiap perubahan auth/native wajib disinkronkan ke Android lokal:

```bash
git pull
npm install
npm run build
npm run android:sync
```

## Upload ke Play Store

1. Play Console → Create app → Production → Create new release
2. Upload `app-release.aab`
3. Isi release notes (sumber: `app_releases` table → admin Release Notes)
4. Review & Rollout

Pertama kali: Play akan minta isi Store listing, Content rating, Target audience, Data safety, Privacy policy URL (`https://www.bengkelstroban.com/legal/privacy`).

## Phase 2 — Native Experience Notes

### Launcher Icon Structure (prepare before first release)

Generate launcher icons (use Android Studio → Image Asset, or a tool like
`@capacitor/assets`) into the following structure. Do **not** commit
placeholder PNGs — leave the structure empty until final art is approved.

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png            (48×48)
├── mipmap-hdpi/ic_launcher.png            (72×72)
├── mipmap-xhdpi/ic_launcher.png           (96×96)
├── mipmap-xxhdpi/ic_launcher.png          (144×144)
├── mipmap-xxxhdpi/ic_launcher.png         (192×192)
├── mipmap-anydpi-v26/
│   ├── ic_launcher.xml                    (adaptive: foreground + background)
│   └── ic_launcher_round.xml
├── drawable/
│   ├── ic_launcher_foreground.xml         (or PNG @ 432×432 in drawable-*dpi)
│   └── ic_launcher_monochrome.xml         (Android 13+ themed icons)
└── values/ic_launcher_background.xml      (<color name="ic_launcher_background">#D50000</color>)
```

### Splash Screen

Configured in `capacitor.config.ts` (background `#D50000`, 1000ms, fade-out).
Place the splash logo (transparent PNG, 1024×1024 recommended) at:

```
android/app/src/main/res/drawable/splash.png
android/app/src/main/res/drawable-port-*/splash.png   (per density)
android/app/src/main/res/drawable-land-*/splash.png
```

### Version Source of Truth

`src/config/version.ts` exports `APP_VERSION` and `APP_BUILD_NUMBER`.
`npm run android:sync` reads from there first and falls back to a date-based
version if the file is missing. Bump both values before each Play Store release.

### External Links

All WhatsApp / Maps / Instagram / Facebook / YouTube links now route through
`src/utils/openExternal.ts` which opens Chrome Custom Tabs on Android (via
`@capacitor/browser`) and a new tab on the web. Internal URLs stay in-app
through React Router.

### Hardware Back Button

`src/components/AndroidBackHandler.tsx` is mounted globally. Non-home routes
pop the history stack; home shows a "Keluar dari Stroban?" confirm dialog and
calls `App.exitApp()`.

### Update Checker

`src/services/updateChecker.ts` is a scaffold — wire it up against
`app_settings` once an OTA cadence is decided. The existing `VersionGate`
continues to handle force-refresh today.