# Perbaikan Tata Letak Aplikasi Android (Capacitor)

## Masalah

Pada APK terpasang:

1. **Atas terpotong** — judul halaman ("Promo & Voucher") dan badge tertutup status bar Android. Penyebab: `env(safe-area-inset-top)` mengembalikan `0` di WebView Capacitor karena viewport belum `viewport-fit=cover` dan StatusBar plugin belum dikonfigurasi overlay.
2. **Bawah tertutup** — cookie consent banner muncul di atas system nav bar dan menumpuk BottomNav. Penyebab: posisi `bottom-4` tidak menambahkan `env(safe-area-inset-bottom)` maupun tinggi BottomNav (`--bottom-nav-height`).

Tidak ada perubahan database / endpoint / flow. Murni perbaikan presentasi.

## Perubahan

### 1. `index.html`
Tambahkan `viewport-fit=cover` ke meta viewport supaya WebView memberi nilai `env(safe-area-inset-*)` yang benar di Android & iOS.

```text
viewport: width=device-width, initial-scale=1.0, maximum-scale=5.0,
          user-scalable=yes, viewport-fit=cover
```

### 2. `capacitor.config.ts`
Tambah konfigurasi StatusBar overlay + warna latar agar konten boleh menempati area di belakang status bar (edge-to-edge):

```ts
plugins: {
  StatusBar: {
    overlaysWebView: true,
    style: 'LIGHT',
    backgroundColor: '#00000000',
  },
  ...
}
```

### 3. `package.json`
Tambah dependensi `@capacitor/status-bar` (sudah resmi Capacitor, tanpa secret) supaya konfigurasi overlay terpasang & dapat diset runtime.

### 4. `src/main.tsx`
Tambah inisialisasi runtime hanya saat berjalan di native (tidak mempengaruhi web):

```ts
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
}
```

### 5. `src/components/CookieConsentBanner.tsx`
Ubah posisi fixed agar selalu di atas BottomNav + system nav bar Android:

```tsx
className="fixed left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[60] ..."
style={{
  bottom: 'calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom) + 1rem)',
}}
```

### 6. `src/index.css` (kecil)
Pastikan `--bottom-nav-height` terdefinisi global (sudah ada di kelas `.has-bottom-nav` — pindahkan default `4rem` ke `:root` agar variabel ada di seluruh halaman, bukan hanya halaman yang menampilkan BottomNav). Default = `0px` di desktop, `4rem` di breakpoint `md:` ke bawah jika BottomNav aktif.

### 7. Verifikasi tampilan
Tidak perlu rebuild Android di sini — perbaikan akan aktif setelah user menjalankan:
```
git pull && npm install && npm run build && npx cap sync android
```
seperti tercatat di `ANDROID_BUILD.md` (tidak diubah).

## Yang TIDAK diubah

- Database, RLS, edge functions, endpoint.
- Flow booking, push notification, force refresh, version gate.
- `firebase-messaging-sw.js`, `src/integrations/supabase/*`, `.env`, `supabase/config.toml`.
- Logika cookie consent — hanya posisi visual.
- Navbar logic — hanya bergantung pada `env(safe-area-inset-top)` yang kini bernilai benar setelah viewport + StatusBar fix.

## Quality Control

- Tidak ada blank/white screen (tidak menyentuh root render).
- Tidak ada routing/login loop (tidak menyentuh router/auth).
- Web preview tetap normal (StatusBar plugin no-op di web; `viewport-fit=cover` aman di browser).
