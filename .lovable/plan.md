## Masalah

Setelah login Google sukses, browser tetap menampilkan halaman web `bengkelstroban.com` dan tidak otomatis kembali ke aplikasi Android. Ini terjadi karena saat ini `signInWithGoogle()` (native) memakai `redirectTo: com.bengkelstroban.app://auth/callback`, tapi Google **memblokir redirect ke custom scheme** dari Supabase callback — sehingga Supabase fallback ke `SITE_URL` (web), dan browser berhenti di sana.

## Solusi: Pakai HTTPS App Link sebagai jembatan

Browser **selalu** dikirim ke URL HTTPS publik. Halaman tersebut kemudian:
1. Jika dibuka di Android (verified App Link) → Android langsung membuka aplikasi tanpa browser.
2. Jika tetap dibuka di browser (App Link belum terverifikasi) → halaman otomatis memicu `intent://...#Intent;scheme=com.bengkelstroban.app;...end` untuk membuka aplikasi, plus tombol "Buka di Aplikasi" sebagai fallback manual.

Di dalam aplikasi, Capacitor `App.addListener('appUrlOpen', ...)` menangkap URL dan menyelesaikan sesi Supabase via `exchangeCodeForSession`.

## Perubahan kode

1. **`src/lib/googleAuth.ts`** — native path ganti `redirectTo` ke `https://www.bengkelstroban.com/auth/native-callback`. Web path tetap.

2. **`src/pages/AuthCallback.tsx`** (rute `/auth/native-callback` baru, atau reuse halaman ini dengan path khusus):
   - Deteksi UA Android.
   - Coba `window.location.replace("intent://www.bengkelstroban.com/auth/native-callback?<params>#Intent;scheme=https;package=com.bengkelstroban.app;end")`.
   - Tampilkan tombol "Buka Aplikasi Stroban" (anchor `intent://`) sebagai fallback.
   - Bila tidak ada UA Android (user buka di desktop) → jalankan flow web normal.

3. **`src/components/NativeAuthBridge.tsx`** — pastikan listener `appUrlOpen` aktif (sudah ada, tinggal dipasang lagi di `App.tsx` kalau sempat dilepas), dan saat menerima URL dengan `?code=...` panggil `supabase.auth.exchangeCodeForSession(code)` lalu navigate ke `popIntendedRoute()`.

4. **`public/.well-known/assetlinks.json`** — instruksi user ganti `REPLACE_WITH_*` dengan SHA256 keystore (upload + Play App Signing). Tanpa ini App Link tidak auto-verify, tapi flow `intent://` tetap jalan dengan satu ketukan.

5. **`ANDROID_BUILD.md`** — tambahkan intent-filter HTTPS untuk `https://www.bengkelstroban.com/auth/native-callback` dengan `android:autoVerify="true"` di `AndroidManifest.xml`, plus catatan SHA256.

## Catatan teknis (untuk user)

- Setelah `assetlinks.json` di-update dengan SHA256 asli dan APK di-rebuild, Android (≥6) akan memverifikasi App Link dan **langsung** membuka aplikasi tanpa melihat browser sama sekali.
- Selama SHA256 belum disetel, user akan melihat halaman jembatan sepersekian detik lalu prompt "Buka dengan Stroban" — masih one-tap, tidak stuck di web.
- Tidak ada dependency native baru. Kompatibel dengan Capacitor 8.

## Aksi user setelah merge

1. `git pull && npm install && npm run build && npm run android:sync`
2. Tambahkan SHA256 fingerprint ke `public/.well-known/assetlinks.json`.
3. Tambahkan intent-filter HTTPS App Link sesuai `ANDROID_BUILD.md`.
4. Rebuild AAB & test login Google.
