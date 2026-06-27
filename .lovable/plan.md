## Tiga perbaikan (Android native)

### 1. Floating "Pesanan" tertutup tombol Home Android
**File:** `src/components/FloatingCartPill.tsx`
- Saat ini posisi mobile dipatok `bottom-[72px]` (asumsi BottomNav 64px tetap). Di Android edge-to-edge, BottomNav tumbuh karena `safe-area-bottom`, sehingga pill jatuh ke area gesture/home indicator.
- Ganti style mobile menjadi inline:
  ```tsx
  style={{ bottom: "calc(env(safe-area-inset-bottom) + 4rem + 0.5rem)" }}
  ```
  dan hapus utility `bottom-[72px]` (md+ tetap pakai `bottom-6` lewat class breakpoint).
- Verifikasi: WhatsAppButton & ChatWidget juga sebaiknya pakai pola sama bila terdampak (cek sekilas, perbaiki bila perlu).

### 2. Google login 404 `/~oauth/initiate` di aplikasi Android
**Akar masalah:** `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` mengarahkan WebView ke `capacitor://localhost/~oauth/initiate`. Route `/~oauth/*` hanya disajikan oleh hosting Lovable (web), bukan WebView native → React Router menampilkan 404.

**Fix:** Buat helper `signInGoogleNative()` di `src/lib/googleAuth.ts` yang:
- Bila `isNative()` → import `@capacitor/browser` dan buka `${webBaseUrl()}/auth?google=1&return=app` di Chrome Custom Tab (Browser plugin), lalu *return* tanpa memanggil helper Lovable. Tambahkan handler kecil di `src/pages/Auth.tsx` yang bila query `?google=1` terdeteksi pada origin web, langsung memanggil `lovable.auth.signInWithOAuth("google", { redirect_uri: webBaseUrl() })` (sehingga seluruh handshake terjadi di domain web yang punya `/~oauth/*`).
- Bila web biasa → fallback ke perilaku saat ini (`redirect_uri: window.location.origin`).

**Penyesuaian call site:**
- `src/components/LoginDialog.tsx` dan `src/pages/Auth.tsx`: pakai helper baru, dan **pada native** tambahkan toast info bila pengguna tidak punya koneksi (helper akan fallback ke email/HP).
- Catatan: setelah login di tab eksternal, sesi tersimpan di origin web. Untuk membawa sesi ke aplikasi, kita ikut menyalakan deep-link kembali ke `com.bengkelstroban.app://auth-return` (placeholder). Karena `android/` belum di-generate di repo ini, instruksi *AssetLinks* dipindahkan ke `ANDROID_BUILD.md` agar tim Android Studio menambahkan intent-filter. Tahap pertama yang dikirim adalah: **(a)** hilangkan 404, **(b)** alurkan login ke browser eksternal. Penyelarasan sesi balik ke native (deep-link) didokumentasikan sebagai langkah lanjut.

### 3. Icon aplikasi Android masih default Capacitor
Folder `android/` tidak berada di repo (di-generate `npx cap add android` secara lokal). Maka penggantian icon harus dijalankan di mesin lokal pemilik proyek. Yang bisa dilakukan dari sisi repo:

- Tambahkan **`resources/icon.png`** (1024×1024 logo Stroban biru) dan **`resources/icon-foreground.png`** + **`resources/icon-background.png`** ke repository sebagai *source of truth*.
- Tambahkan dev-dependency `@capacitor/assets` dan script `npm run android:icons` → `capacitor-assets generate --android` yang otomatis mengisi seluruh `mipmap-*` + adaptive icon dari satu sumber.
- Perbarui `ANDROID_BUILD.md` dengan urutan: `npm i && npx cap add android && npm run android:icons && npx cap sync android`.
- (Opsional, sekali jalan) jika user mau saya bisa generate ulang `android-icons.zip` dengan logo biru baru yang terlihat di gambar 3 dan menyertakannya sebagai artifact.

### Technical detail
- `FloatingCartPill` cukup edit baris className+style; logic tidak berubah.
- Helper `googleAuth.ts` membungkus deteksi platform; tidak menyentuh `src/integrations/lovable/*`.
- `@capacitor/browser` sudah terpasang (Phase 2). Tidak perlu install baru.
- Tidak ada perubahan skema DB, RLS, atau Edge Function.

### Pertanyaan sebelum eksekusi
- Apakah Anda ingin saya **generate ulang `android-icons.zip`** berbasis logo biru Stroban di gambar 3 (selain menyiapkan flow `@capacitor/assets`)? Jika ya, mohon unggah file PNG logo asli (≥1024×1024, background transparan) — gambar yang dilampirkan ini terlalu kecil (~150 px) untuk dijadikan sumber tajam.
