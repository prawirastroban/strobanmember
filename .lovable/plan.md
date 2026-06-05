## Tujuan

Setelah PWA di-install (Add to Home Screen), pastikan:
1. Notifikasi muncul real-time di **system tray HP** (seperti WhatsApp/IG), bukan cuma toast in-app.
2. Banner install otomatis hilang di perangkat yang sudah install (sudah benar — akan diperkuat & ditampilkan statusnya di dashboard).
3. Pengguna bisa atur **ringtone, getar, dan ikon notifikasi** dari halaman dashboard **PWA & Install**.
4. Dashboard menampilkan status install + permission perangkat saat ini, plus tombol **Test Notifikasi**.
5. Pengaturan tersinkronisasi realtime ke semua perangkat (lewat tabel `pwa_settings` yang sudah ada + per-user preferensi baru).

## Yang akan dibangun

### 1. Database (1 migration)

**Extend `public.pwa_settings`** (singleton global, dikelola owner):
- `notification_enabled boolean default true` — master switch web-push.
- `notification_icon_url text` — ikon notifikasi (default = logo brand).
- `notification_sound_url text` — URL custom ringtone (mp3/ogg) default null = pakai sistem.
- `default_ringtone text default 'default'` — preset: `default | chime | bell | ding | silent`.
- `default_vibrate boolean default true`.

**Buat `public.user_notification_prefs`** (per pengguna, override pengaturan global):
- `user_id uuid PK references auth.users`, `ringtone text`, `vibrate boolean`, `enabled boolean default true`, `updated_at timestamptz`.
- RLS: user CRUD baris sendiri; admin SELECT semua. GRANT authenticated + service_role. Realtime ON.

**Buat bucket storage `pwa-assets`** (public read, admin write) untuk upload custom ringtone & ikon.

### 2. Service Worker FCM (`public/firebase-messaging-sw.js`)

- Simpan konfig notifikasi (icon, sound, vibrate, ringtone preset) di IndexedDB via `postMessage` dari client tiap settings berubah.
- `onBackgroundMessage` → `showNotification` dengan:
  - `icon` = `notification_icon_url` atau logo brand.
  - `badge` = monokrom 96×96 (sudah ada placeholder).
  - `vibrate: [200,100,200]` jika diaktifkan.
  - `tag` per `reference_id` supaya tidak menumpuk; `renotify: true` untuk re-alert.
  - `requireInteraction: false`, `silent: false`.
  - Untuk ringtone custom: play via `<audio>` di client saat foreground (SW tidak bisa langsung play audio, jadi sound preset diserahkan ke OS default + custom ringtone fallback di foreground listener).

Catatan: Web Push di Android Chrome mengikuti suara channel "Sites" Android — kita tidak bisa override suara di lockscreen, tapi bisa atur **vibrate pattern + ikon + tag** (yang user inginkan: "muncul di layar notifikasi masuk seperti sosmed"). Ini sudah berjalan begitu permission `granted` + FCM token tersimpan.

### 3. Frontend

**`useWebPush.ts`**: tambah auto-trigger setelah PWA terdeteksi standalone — jika `Notification.permission === 'default'` dan user sudah login, kirim event ke komponen prompt (bukan auto-request, agar gesture-driven).

**`InstallAppBanner.tsx`**: setelah `appinstalled` (atau saat mount kalau sudah standalone), tampilkan dialog satu kali **"Aktifkan notifikasi"** → memicu `Notification.requestPermission()` + register FCM token. Jika ditolak/diterima, simpan flag agar tidak muncul lagi.

**`src/hooks/useNotificationPrefs.ts` (baru)**: gabungkan `pwa_settings` global + override `user_notification_prefs`, kirim ke SW via `postMessage({type:'NOTIF_CONFIG', ...})`.

**`src/components/admin/PwaSettingsManager.tsx`**: tambah section baru:
- **Status perangkat ini** — kartu: Installed? (display-mode), Permission notifikasi (granted/denied/default), FCM token tersimpan? (cek `push_tokens` by user). Tombol **Minta Izin Notifikasi**, **Kirim Test Notifikasi** (insert ke `notifications` lalu invoke `dispatch-notification`).
- **Pengaturan Notifikasi Global** — toggle aktif, pilih preset ringtone (radio + sample play), toggle vibrate default, upload ikon & ringtone custom (ke bucket `pwa-assets`).

**`src/pages/Profile.tsx`** (atau komponen baru `NotificationPrefsCard`): UI per-user untuk override ringtone/vibrate/enabled dari pengaturan global. Auto-sync ke SW saat berubah.

### 4. Verifikasi banner install

`useInstallPrompt.show` sudah = `!isInstalled && !isNative` — jadi setelah Add to Home Screen, `display-mode: standalone` aktif → banner tidak muncul (sesuai laporan user "tidak terlihat di hp saya" = perilaku benar). Dashboard akan menampilkan badge **"Perangkat ini sudah terinstall"** supaya user tahu kenapa banner hilang.

## Yang TIDAK diubah

- Capacitor native push (`usePushNotifications`) — sudah ok untuk APK.
- Manifest, registerSW, kill-switch, struktur tabel `pwa_events`, `push_tokens`, alur booking/payment/auth.
- `dispatch-notification` edge function — sudah benar mengirim ke FCM v1 dengan priority HIGH + apns sound default.

## Catatan teknis

- Suara custom di Android Web Push hanya bekerja di foreground (Notification API tidak punya field `sound` yang andal lintas browser). Pengaturan ringtone akan diterapkan: **(a) lockscreen** = ikut channel sistem Android (user atur di Settings → Apps → Chrome/PWA → Notifications → Sound), **(b) saat app/tab terbuka** = play file ringtone yang dipilih via `<audio>` ketika `onMessage` foreground.
- iOS Safari ≥ 16.4: Web Push hanya bekerja setelah Add to Home Screen. Banner di-install dulu, baru minta permission — flow sudah disusun begitu.
