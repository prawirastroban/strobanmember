## Tujuan

Hilangkan total layar "Login berhasil / Buka Stroban" di Android. Setelah user pilih akun Google, app harus langsung lanjut ke halaman tujuan tanpa interaksi tambahan, tanpa Chrome Custom Tab yang tertinggal, tanpa loop, dan tetap kompatibel dengan Web/PWA/Desktop.

## Akar Masalah (hasil audit)

1. Di Android, `signInWithGoogle` membuka Chrome Custom Tab → Lovable `/~oauth/initiate` → Google → Supabase → `redirect_uri = https://www.bengkelstroban.com/auth/native-callback`.
2. Karena `redirect_uri` adalah HTTPS, halaman web **selalu** ter-render lebih dulu. Hanya jika Android App Link sudah **verified** (assetlinks.json + SHA-256 cocok + APK rebuild), Chrome akan auto-intercept. Saat ini placeholder SHA-256 di `assetlinks.json` belum diisi, jadi verifikasi mustahil → halaman web selalu muncul.
3. Dari halaman itu, `window.location.replace(intent://...)` diblok Chrome Custom Tabs tanpa user gesture. Tombol `<a href="intent://...">` juga gagal di banyak device karena CCT tidak menjalankan intent fallback ke app yang sudah terinstall jika scheme tidak terdaftar sebagai handler default.
4. Selama Lovable broker dipakai dengan HTTPS redirect, layar antara itu **secara arsitektur tidak bisa dihilangkan**. Memperbaiki di sisi web hanya akan menghasilkan tambalan baru.

## Solusi: Native Google Sign-In (bukan Custom Tab)

Pakai `@capacitor/google-auth` (plugin resmi maintained Capgo, dipakai luas di Play Store). Flow native:

```
Tap "Login Google"
  → Sistem Android menampilkan account picker native (bukan browser)
  → Plugin mengembalikan ID token Google
  → supabase.auth.signInWithIdToken({ provider: 'google', token })
  → Session siap, navigate ke halaman terakhir
```

Tidak ada browser, tidak ada deep link OAuth, tidak ada Chrome Custom Tab, tidak ada halaman callback web. Web/PWA/Desktop tetap pakai jalur Lovable broker yang sudah ada.

## Perubahan Kode

### Ditambahkan
- Dependency `@capacitor/google-auth` (atau `@codetrix-studio/capacitor-google-auth`).
- `src/lib/nativeGoogleAuth.ts` — wrapper: `nativeGoogleSignIn()` → panggil plugin → ambil `idToken` → `supabase.auth.signInWithIdToken`.
- `src/lib/lastRoute.ts` — helper kecil `saveIntendedRoute()` / `popIntendedRoute()` yang menyimpan `pathname+search+hash` ke `sessionStorage` sebelum login dan dipakai oleh `AuthContext` setelah session terisi.
- `src/lib/debug/oauthDiagnostics.ts` — logger ringan, aktif hanya saat `import.meta.env.DEV`. Mencatat: jalur yang dipakai (native/web), idToken (panjang saja, bukan isinya), hasil `signInWithIdToken`, dan target navigasi.

### Diubah
- `src/lib/googleAuth.ts` — `signInWithGoogle()` di Android memanggil `nativeGoogleSignIn()` alih-alih membuka Custom Tab. Web tetap memakai `lovable.auth.signInWithOAuth("google")`.
- `src/contexts/AuthContext.tsx` — saat `onAuthStateChange` menerima session baru, panggil `popIntendedRoute()` dan navigate ke sana (sudah ada `postLoginRedirect`, dibersihkan jadi satu jalur).
- `src/components/LoginDialog.tsx` dan layar `src/pages/Auth.tsx` — sebelum memanggil `signInWithGoogle`, panggil `saveIntendedRoute()`.
- `capacitor.config.ts` — tambah konfigurasi plugin `GoogleAuth` (`serverClientId`, `scopes: ['email','profile']`).
- `src/utils/openExternal.ts` — `isInternalUrl()` dipindah ke sini (sudah ada), jadi satu sumber. Audit semua `window.open` / `window.location.href` / `target="_blank"` dan ganti dengan `navigate()` (internal) atau `openExternal()` (eksternal). Daftar file yang akan disisir: `src/components/WhatsAppButton.tsx`, `src/components/Footer.tsx`, `src/components/BranchLocations.tsx`, `src/components/admin/**`, dan semua callsite hasil `rg "window\\.(open|location)"`.
- `ANDROID_BUILD.md` — section baru "Native Google Sign-In setup" (Web Client ID dari Firebase Console, langkah `npx cap sync android`). Section App Link untuk OAuth dihapus karena tidak lagi diperlukan.

### Dihapus / di-deprecate
- `src/pages/OAuthBrokerFallback.tsx` — tidak lagi dibutuhkan, route `/~oauth/*` dihapus dari `App.tsx`.
- `src/components/NativeAuthBridge.tsx` — tidak ada lagi deep link OAuth masuk; sisakan stub kosong atau hapus total. Listener `appUrlOpen` dipindah ke handler push/notifikasi yang sudah ada bila perlu.
- `src/pages/AuthCallback.tsx` — tetap ada untuk web (provider OAuth via Lovable broker masih bisa mendarat di sini), tapi seluruh logika "native return", `triggerReturn`, `buildReturnUrls`, `intentUrl`, tombol "Buka Stroban", dan state `NATIVE_RETURN_ATTEMPT_KEY` dihapus. Setelah session siap, hanya `navigate(next)`.
- Route `/auth/native-callback` di `App.tsx` dihapus.
- Konstanta yang tidak terpakai di `src/lib/googleAuth.ts` (`NATIVE_AUTH_CALLBACK_URL`, `LEGACY_*`, `NATIVE_AUTH_APP_LINK_URL`, `nativeAuthIntentUrl`, `nativeAuthBrowserFallbackUrl`, `NATIVE_STATE_PREFIX`, dll) dihapus.
- `public/.well-known/assetlinks.json` — tetap dipertahankan (berguna untuk App Link fitur lain bila ada nanti), tapi tidak lagi wajib untuk login.

### Konfigurasi Android (didokumentasikan, dijalankan user di mesin lokal)
- Intent-filter OAuth di `AndroidManifest.xml` (yang ditambahkan di iterasi sebelumnya) **dihapus** — tidak diperlukan lagi.
- Tambahkan `google-services.json` (sudah ada untuk FCM) — plugin Google Auth memakai Web Client ID yang sama.
- `npm install && npx cap sync android` setelah pull.

## Alur Setelah Perbaikan

```
[Android]
User tap "Login dengan Google"
  → saveIntendedRoute("/booking?x=1")
  → GoogleAuth.signIn()  (Account Picker native)
  → idToken
  → supabase.auth.signInWithIdToken({ provider:'google', token })
  → onAuthStateChange → AuthContext
  → navigate(popIntendedRoute() ?? "/")
DONE — tidak ada browser, tidak ada halaman web antara.

[Web / PWA / Desktop]
User tap "Login dengan Google"
  → saveIntendedRoute(...)
  → lovable.auth.signInWithOAuth("google", { redirect_uri: origin })
  → kembali ke origin
  → AuthContext menangani redirect
```

## Kompatibilitas

- Web/PWA tidak berubah (jalur `lovable.auth.signInWithOAuth`).
- Email/password, WA OTP, reset password tidak tersentuh.
- Android back button (`AndroidBackHandler`) tidak terpengaruh.
- Tidak ada perubahan skema database.

## Checklist Tes Manual

- Android APK fresh install → tap Login Google → account picker muncul → pilih akun → langsung masuk ke halaman tujuan, tidak ada browser.
- Android: login dari `/booking` → setelah login kembali ke `/booking` (bukan home).
- Android: logout lalu login lagi → tidak duplikat session, tidak ada loop.
- Web preview Lovable → Login Google tetap jalan via popup.
- PWA standalone Chrome → Login Google tetap jalan.
- WhatsApp button, Maps button, link sosial → buka di Custom Tab (eksternal), bukan keluar app.
- Internal navigation (Bottom Nav, link katalog) → tetap di-WebView, tidak buka browser.
- Hardware back di halaman dalam → pop history; di home → konfirmasi keluar.

## Catatan Penting untuk Build Android

Setelah merge, user **wajib**:
1. `git pull && npm install`
2. Ambil **Web Client ID** dari Firebase Console (project `bengkel-stroban` → Authentication → Sign-in method → Google → Web SDK configuration).
3. Tempel ke `capacitor.config.ts` (`plugins.GoogleAuth.serverClientId`) atau ke `strings.xml` Android sesuai dokumentasi plugin.
4. Pastikan SHA-1 debug & release sudah terdaftar di Firebase Console (sudah jadi prasyarat FCM, biasanya sudah ada).
5. `npm run build && npx cap sync android` → rebuild AAB.

Tanpa langkah 2–4, native Google Sign-In akan return error `10` (DEVELOPER_ERROR). Ini didokumentasikan jelas di `ANDROID_BUILD.md`.
