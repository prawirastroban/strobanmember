## Notifikasi otomatis untuk perubahan status booking

Setiap kali status booking atau status pembayaran berubah, pelanggan akan menerima notifikasi melalui **3 channel sekaligus**: lonceng in-app (realtime), WhatsApp (Twilio), dan push native ke handphone (Capacitor + FCM/APNs). Izin notifikasi di handphone juga akan diminta otomatis saat pertama kali user login di aplikasi (web & native).

### Apa yang akan dibangun

**1. Database trigger (otomatis, tidak bisa di-bypass)**
- Trigger baru di tabel `bookings` yang menyala setiap `UPDATE` ketika `status` ATAU `payment_status` berubah.
- Trigger tersebut:
  - Insert ke tabel `notifications` (lonceng in-app sudah tersinkron realtime).
  - Memanggil edge function `notify-booking-status` lewat `pg_net` (async, tidak memblok update).
- Pesan dirakit dengan label Bahasa Indonesia (mis. "Booking dikonfirmasi", "Sedang dikerjakan", "Selesai", "Pembayaran lunas", dll).

**2. Edge function baru: `notify-booking-status`**
- Menerima `booking_id`, `old_status`, `new_status`, `old_payment_status`, `new_payment_status`.
- Mengirim **WhatsApp** ke `customer_phone` lewat Twilio gateway (template pesan singkat + link tracking `/booking-status/:id`).
- Mengirim **push notification native** ke semua `push_tokens` user via FCM HTTP v1 (Android & web token) dan APNs (iOS) — payload include `route: /booking-status/:id` agar tap notif → buka halaman tracking.
- Idempoten: tidak mengirim ulang bila status sama.

**3. Permission prompt notifikasi di handphone**
- Komponen `PushNotificationManager` sudah ada tapi auto-register diam-diam. Akan ditambah:
  - **Banner permintaan izin** muncul di `/dashboard` user (1× per sesi, bisa di-dismiss) yang menjelaskan manfaat dan tombol "Aktifkan Notifikasi".
  - Pada native (Capacitor), menekan tombol memunculkan dialog izin OS.
  - Pada web/PWA, akan meminta `Notification.requestPermission()` dan mendaftarkan Web Push token (FCM web) ke tabel `push_tokens` dengan `platform = 'web'`.
- Status izin disimpan supaya banner tidak terus muncul setelah granted/denied.

**4. Pengaturan admin (opsional, ringan)**
- Di `/dashboard/settings` (atau panel kecil di marketing), toggle untuk mengaktifkan/menonaktifkan channel WhatsApp & Push per jenis status, tersimpan di `app_settings` key `booking_notifications`. Default semua ON.

### Yang Anda perlu siapkan (saya akan minta saat eksekusi)
- **Firebase service account JSON** (untuk FCM HTTP v1 — Android & Web Push). Saya akan request via secrets dengan nama `FCM_SERVICE_ACCOUNT_JSON` dan `FCM_PROJECT_ID`.
- **APNs Auth Key** (opsional, hanya jika perlu push iOS native): `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_AUTH_KEY_P8`.
- **Twilio**: sudah terhubung di project (per memory). Saya akan pakai koneksi yang ada.

Tanpa kredensial FCM/APNs, lonceng in-app + WhatsApp tetap jalan; push native akan otomatis aktif begitu kredensial ditambahkan.

### Detail teknis (untuk referensi)

```text
bookings UPDATE
   │
   ├─► trigger: notify_booking_status_change()
   │     ├─ INSERT notifications  (realtime → NotificationBell)
   │     └─ pg_net.http_post → edge: notify-booking-status
   │
   └─► edge: notify-booking-status
         ├─ Twilio /Messages.json (WhatsApp)
         ├─ FCM v1 send (per token Android/Web)
         └─ APNs HTTP/2 (per token iOS) [opsional]
```

Label status (Bahasa Indonesia): waiting_confirmation → "Menunggu Konfirmasi", confirmed → "Dikonfirmasi", checked_in → "Check-in", in_progress → "Sedang Dikerjakan", completed → "Selesai", cancelled → "Dibatalkan". Payment: paid → "Pembayaran Lunas", refund → "Dana Dikembalikan".
