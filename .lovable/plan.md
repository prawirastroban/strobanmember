## Tujuan
Setiap notifikasi yang masuk ke tabel `notifications` otomatis dialarm-kan ke **semua device** user terkait (Android/iOS native app + Web browser), dan saat di-tap langsung diarahkan ke halaman yang sesuai (mis. notifikasi "Pendaftaran Baru" → `/dashboard/customers/{user_id}`).

## Kondisi sekarang
- ✅ Lonceng in-app (`NotificationBell`) sudah realtime & sudah routing via `metadata.redirect_to` (termasuk `/dashboard/customers/{registered_user_id}` untuk verifikasi).
- ✅ Push native FCM hanya jalan untuk **booking status** lewat edge function `notify-booking-status`.
- ❌ Notifikasi lain (registrasi baru, pembayaran, pembatalan, tire order, referral, dll) hanya masuk DB — **tidak ada push** ke device.
- ❌ Browser tidak menerima push saat tab tertutup (belum ada Web Push).
- ❌ Tap push native belum konsisten membuka route dari `metadata.redirect_to`.

## Rencana Implementasi

### 1. Edge Function baru `dispatch-notification`
File: `supabase/functions/dispatch-notification/index.ts` (`verify_jwt = false`, dipanggil oleh trigger DB via `pg_net`).
- Input: `{ notification_id }`.
- Ambil row notifikasi + semua `push_tokens` milik `user_id` (web/android/ios).
- Kirim FCM v1 ke setiap token dengan payload:
  - `notification.title` / `body` dari row.
  - `data.route` = `metadata.redirect_to` (fallback per-`type`, sama dengan logic `NotificationBell.resolveRedirect`).
  - `data.notification_id`, `data.type`, `data.reference_id`.
  - `android.priority=HIGH`, `apns.headers.apns-priority=10`, `webpush.fcm_options.link = <origin>+route`.
- Token invalid (`UNREGISTERED` / `INVALID_ARGUMENT`) otomatis di-delete dari `push_tokens`.

### 2. Trigger DB `on_notification_insert`
Migration baru:
- Enable extension `pg_net` (kalau belum).
- Trigger `AFTER INSERT ON public.notifications` memanggil `net.http_post` ke `dispatch-notification` dengan service-role auth.
- Helper SQL `app_settings` baru utk simpan `dispatch_url` & `service_role_token` (atau hard-code env via edge function URL pakai `current_setting('app.supabase_url')`).

### 3. Web Push (FCM Web)
- Tambah file statis `public/firebase-messaging-sw.js` (messaging worker only — terpisah dari PWA app-shell SW, sesuai aturan).
- Hook baru `useWebPush.ts`: minta `Notification.permission`, register service worker, ambil FCM token via VAPID, simpan ke tabel `push_tokens` (platform=`web`).
- Banner ajakan aktifkan di `NotificationPermissionBanner` (sudah ada — diperluas untuk web).
- Saat user tap notifikasi web → SW `notificationclick` → `clients.openWindow(data.route)` → SPA route.

### 4. Routing tap push konsisten
- `usePushNotifications.ts`: ubah handler `pushNotificationActionPerformed` agar pakai React Router (`navigate(data.route)`) lewat custom event, bukan `window.location.href` (cegah full reload & jaga state auth).
- Resolusi route default per-type disinkronkan dengan `NotificationBell.resolveRedirect` → diekstrak ke util shared `src/lib/notificationRoute.ts` agar dipakai bersama (frontend + edge function copy-paste).

### 5. Trigger `handle_new_user` sudah set `metadata.redirect_to='/'` untuk customer
- Tambahkan trigger terpisah `notify_staff_new_registration` (sudah ada) — sudah mengisi `redirect_to=/dashboard/customers/{id}`. ✅ Tidak perlu diubah; dispatcher akan mengirim push ke admin/staff dengan route tsb.

### 6. Secrets yang dibutuhkan (akan diminta setelah plan disetujui)
- `FCM_VAPID_PUBLIC_KEY` (untuk Web Push) — dari Firebase Console → Cloud Messaging → Web configuration.
- `FCM_SERVICE_ACCOUNT_JSON` & `FCM_PROJECT_ID` (sudah ada, dipakai ulang).

### 7. QA checklist
- Buat user baru → admin/staff dapat push native + tap → buka `/dashboard/customers/{id}`.
- Update status booking → customer dapat push → tap → `/booking-status/{id}`.
- Web (Chrome desktop) izinkan notifikasi → trigger event → muncul OS notification → tap buka tab di route yang benar.
- Token expired dihapus otomatis (cek log edge function).

## Catatan teknis non-developer
Ini menambahkan "loudspeaker" pusat: tiap kali sistem menyimpan notifikasi di database, otomatis dikirim ke HP & browser pengguna terkait, lengkap dengan tujuan halaman yang tepat saat di-tap. Tidak ada perubahan tampilan; hanya alur push & routing.
