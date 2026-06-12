
## Diagnosis

Looking at logs + code, three independent root causes:

### 1. Test notification "dikirim" tapi tidak muncul di iPhone
`supabase/functions/dispatch-notification/index.ts` mempunyai **smart delivery skip**: jika user sudah berada di route target notifikasi (`current_route` di `user_presence` cocok dengan `metadata.redirect_to`), push **tidak dikirim**.

Tombol "Kirim Notifikasi Tes" di `PwaSettingsManager.tsx` mengirim notifikasi dengan `metadata: { redirect_to: "/dashboard/pwa-settings" }` — yaitu halaman yang sedang dilihat user. Akibatnya backend log `skipped: user_viewing_target`, push tidak pernah dikirim ke iPhone, padahal toast di web bilang "terkirim".

### 2. Ikon notifikasi & ikon PWA di home screen bukan logo brand
- `public/firebase-messaging-sw.js` pakai `/placeholder.svg` sebagai default `icon` & `badge`.
- `dispatch-notification` juga set `webpush.notification.icon: "/placeholder.svg"`.
- `public/pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, `favicon.png` saat ini bukan logo brand sehingga iOS menampilkan inisial "S" merah seperti di screenshot.

Logo brand resmi ada di tabel `app_branding.logo_light_url` (Supabase storage). Akan di-download lalu di-resize jadi 4 ukuran ikon PWA + diganti di `public/`.

### 3. Auto-register saat Add to Home Screen
- `useWebPush()` sudah auto-register jika `permission === 'granted'`, tapi pertama kali install permission masih `default`.
- `StandaloneNotifPrompt` hanya muncul jika `permission === 'default'` — bagus, tetap dipertahankan (iOS WAJIB butuh user gesture untuk minta permission, tidak bisa silent).
- Yang ditambah: jika user sudah pernah grant permission tapi belum ada token di perangkat baru → langsung silent `registerWebPushNow()` tanpa dialog.

## Perubahan

### A. `supabase/functions/dispatch-notification/index.ts`
Tambahkan bypass smart-skip untuk notifikasi tipe `verification` (digunakan oleh tombol Tes) — tes harus selalu dikirim ke device walaupun user sedang membuka halaman:

```ts
const isTestNotif = String(notif.type ?? "") === "verification";
if (priority !== "critical" && !isTestNotif && targetRoute && targetRoute !== "/") {
  // existing skip logic
}
```

### B. `public/firebase-messaging-sw.js`
Ganti default `/placeholder.svg` → `/pwa-192x192.png` di kedua handler (`onBackgroundMessage` & raw `push`). `NOTIF_CONFIG.iconUrl` tetap bisa override via admin.

### C. `supabase/functions/dispatch-notification/index.ts` (webpush block)
Ganti `icon`/`badge` `"/placeholder.svg"` → `${APP_ORIGIN}/pwa-192x192.png`.

### D. Replace PWA icon files dengan logo brand
Script build-time (sekali jalan saat implement):
1. `curl` `https://yrwttzxrnomaiqxyjrqn.supabase.co/storage/v1/object/public/branding/logo-light/1777880079851.png` ke `/tmp/logo.png`.
2. Pakai ImageMagick (`nix run nixpkgs#imagemagick`) untuk generate:
   - `public/pwa-192x192.png` (192×192)
   - `public/pwa-512x512.png` (512×512)
   - `public/apple-touch-icon.png` (180×180)
   - `public/favicon.png` (256×256)
3. Pad ke kotak putih background bila logo non-square, supaya iOS tidak crop ke huruf.

### E. `src/components/StandaloneNotifPrompt.tsx`
Tambah cabang: kalau standalone + `permission === 'granted'` + belum pernah register di device ini (cek `pwa_notif_registered_v1` di localStorage) → panggil `registerWebPushNow()` langsung tanpa membuka dialog, lalu set flag. Ini menutup skenario "user reinstall PWA di device lain dengan akun yang sudah pernah grant permission".

## Yang TIDAK Diubah
- Tidak ubah VAPID key (sudah valid).
- Tidak ubah schema DB.
- Tidak ubah `register-push-token` edge function.
- Tidak ubah Capacitor / native push.
- Tidak hapus `placeholder.svg` (masih dipakai komponen lain).

## Verifikasi
1. iPhone PWA (sudah terinstall + permission granted) → tap "Kirim Notifikasi Tes" → notif muncul di lockscreen dengan logo brand (bukan huruf S merah).
2. Reinstall PWA di iPhone kedua → masuk → dialog "Aktifkan Notifikasi" muncul → tap "Aktifkan Sekarang" → token tersimpan & test notif sampai.
3. Reinstall PWA di iPhone ketiga (akun sama yang sebelumnya sudah grant) → token otomatis terdaftar tanpa dialog (silent).
4. Ikon di home screen iPhone & Android = logo Sahabat Stroban (bukan inisial S).
