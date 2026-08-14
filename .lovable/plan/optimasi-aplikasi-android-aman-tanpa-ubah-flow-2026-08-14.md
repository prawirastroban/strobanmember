# Optimasi Aplikasi Android (Aman, Tanpa Ubah Flow)

Tujuan: menghilangkan potensi error CORS, lag render WebView, dan menyiapkan konfigurasi native Android — tanpa mengubah navigasi, logika bisnis, atau fitur yang sudah berjalan.

## 1. Header versi hanya untuk same-origin (`src/lib/httpVersionHeaders.ts`)
- Fungsi `shouldInject` sudah membatasi ke same-origin, tapi akan diperketat:
  - Tolak eksplisit host `*.supabase.co` / `*.supabase.in` (dan URL backend dari env) sehingga tidak pernah kena preflight CORS.
  - Tetap izinkan hanya `origin === window.location.origin`.
- Efek: pada Android (origin `https://localhost`) semua panggilan backend tidak lagi membawa header kustom.

## 2. Ilustrasi kategori layanan (`src/components/mobile/home/ServiceCategoryGrid.tsx`)
- Ganti `loading="lazy"` menjadi `loading="eager"` pada gambar ilustrasi 3D (plus `decoding="async"`).
- Hapus `filter: drop-shadow(...)` berlapis pada gambar (mahal untuk WebView Android).
- Bayangan tetap ada secara visual lewat elemen "ground shadow" radial-gradient yang sudah ada, agar tampilan tidak berubah drastis.

## 3. Inisialisasi plugin native tidak memblokir render (`src/App.tsx` + `src/main.tsx`)
- Pindahkan/blokir-lepas inisialisasi native (StatusBar, dan bootstrap terkait Capacitor) ke komponen `NativeBootstrap` kecil di dalam `useEffect` yang berjalan setelah paint (`requestIdleCallback` fallback `setTimeout 0`), dengan import dinamis.
- Tidak ada perubahan urutan provider, route, atau perilaku aplikasi.

## 4. Konfigurasi native Android (butuh keputusan Anda)
Folder `android/` tidak ada di repositori ini (dibuat lokal lewat `npx cap add android`), sehingga `variables.gradle` dan `AndroidManifest.xml` tidak dapat diedit dari sini. Yang akan dilakukan: menuliskan langkah persis di `ANDROID_BUILD.md` agar Anda terapkan sekali di project lokal:
- `android/variables.gradle`: `compileSdkVersion = 35`, `targetSdkVersion = 35` (biarkan `minSdkVersion` apa adanya).
- `android/app/src/main/AndroidManifest.xml`: tambah `BLUETOOTH`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`.

## Verifikasi
- Build produksi dijalankan untuk memastikan tidak ada regresi kompilasi.
- Setelah approve: `git pull` → `npm run build` → `npx cap sync android`.
