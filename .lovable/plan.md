# Android Conversion Preparation — Stroban

Capacitor sudah terinstal (`@capacitor/core`, `cli`, `android`, `ios`, `firebase-messaging`, `push-notifications`). Yang perlu disesuaikan: **App ID, App Name, mode produksi, version mapping, dan dokumentasi build**. Folder `/android` native **tidak bisa di-generate di sandbox Lovable** (butuh Android Studio / JDK lokal) — itu langkah lokal user.

---

## 1. Update `capacitor.config.ts`

Ganti konfigurasi lama (yang masih pakai `app.lovable.*` + hot-reload URL preview) ke produksi:

```ts
const config: CapacitorConfig = {
  appId: 'com.bengkelstroban.app',
  appName: 'Stroban',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchShowDuration: 1500, backgroundColor: '#E53935' },
  },
};
```

Catatan: **`server.url` dihapus** agar app memuat bundle lokal `dist/` (produksi), bukan preview Lovable. Tanpa ini → white screen di Play Store build.

## 2. Version mapping ke Gradle

Tambah file helper `scripts/sync-android-version.mjs` yang membaca `APP_VERSION` + `APP_BUILD_NUMBER` dari `src/lib/appVersion.ts` (sumber yang sama dengan PWA) lalu menulis ke `android/app/build.gradle`:

- `versionName` ← `APP_VERSION` (mis. `2026.0115.1430`)
- `versionCode` ← `APP_BUILD_NUMBER` (integer monotonic, sudah disiapkan)

Dijalankan otomatis lewat npm script: `"android:sync": "node scripts/sync-android-version.mjs && npx cap sync android"`.

## 3. PWA compatibility (tidak diubah)

Verifikasi (read-only) bahwa modul berikut tetap jalan di WebView Android:
- WhatsApp OTP (`wa-password-reset`, `phone-otp-login`)
- FCM via `@capacitor-firebase/messaging` (sudah ada di `usePushNotifications.ts`)
- Booking, Tracking, Loyalty, Referral, Reports, Force Refresh, `offline.html`

Tidak ada perubahan kode flow — hanya pastikan `capacitor.config.ts` tidak override route.

## 4. Dokumentasi build (file baru `ANDROID_BUILD.md`)

Berisi langkah lokal user (sandbox tidak bisa jalankan `npx cap add android` karena butuh JDK + Android SDK):

```text
1. git pull
2. npm install
3. npm run build
4. npx cap add android        # generate folder /android (sekali)
5. npm run android:sync       # sinkron versionName/versionCode + cap sync
6. npx cap open android       # buka Android Studio
7. Build > Generate Signed Bundle / APK > Android App Bundle (AAB)
```

Plus dokumentasi Firebase:
- **Firebase Project ID**: diambil dari `public/firebase-messaging-sw.js` (akan dicantumkan di file)
- **Package name** yang harus didaftarkan di Firebase Console → Add Android app: `com.bengkelstroban.app`
- Cara generate **SHA-1 / SHA-256** (debug & release):
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  keytool -list -v -keystore <release.keystore> -alias <alias>
  ```
- Download `google-services.json` → letakkan di `android/app/google-services.json`

## 5. Quality control checklist (di dokumentasi)

- White/blank screen → pastikan `server.url` dihapus & `npm run build` jalan sebelum `cap sync`
- Routing error → `capacitor.config.ts` tidak set `server.androidScheme` custom; biarkan default `https`
- Login loop → FCM token registrasi tetap pakai jalur `register-push-token` yang sudah ada
- Crash startup → splash background sama dengan theme color manifest (`#E53935`)

---

## File yang akan diubah/dibuat

| File | Aksi |
|---|---|
| `capacitor.config.ts` | Update appId/appName, hapus `server.url`, tambah plugin config |
| `scripts/sync-android-version.mjs` | **Baru** — sync APP_VERSION → Gradle |
| `package.json` | Tambah script `android:sync` |
| `ANDROID_BUILD.md` | **Baru** — instruksi lengkap build AAB + Firebase setup |

## Yang TIDAK disentuh

- Database, RLS, edge functions, endpoint
- Semua business flow (booking, loyalty, referral, reports, force refresh)
- `firebase-messaging-sw.js`, `VersionGate`, `hardReload`, `useAppVersion`
- `src/integrations/supabase/*`, `.env`, `supabase/config.toml`
- PWA manifest & service worker

## Output yang akan dilaporkan setelah build mode

1. ✅ Capacitor sudah terpasang (versi 8.0.2) — hanya konfigurasi diperbarui
2. ⚠️ Folder `/android` **harus di-generate user** lewat `npx cap add android` di mesin lokal (butuh Android Studio + JDK 17)
3. Langkah berikutnya: ikuti `ANDROID_BUILD.md` untuk hasilkan `.aab` siap upload Play Console
