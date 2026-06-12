
# Upgrade Push Notification → Rasa Aplikasi Native

Fokus: payload FCM yang benar, isi notifikasi informatif, grouping, badge & click-action — bukan mempercantik halaman PWA Settings.

## 1. Standarkan Judul & Isi Notifikasi (DB triggers)

Saat ini judul masih beragam ("Update Pembayaran", "Booking Dikonfirmasi"). Akan diseragamkan ke 7 judul resmi yang Anda minta:

| Event                          | Judul                  | Prioritas |
| ------------------------------ | ---------------------- | --------- |
| Booking dibuat (admin/staff)   | `Booking Baru`         | high      |
| Registrasi user baru           | `Customer Baru`        | medium    |
| Pembayaran lunas               | `Pembayaran Berhasil`  | high      |
| Promo dipakai                  | `Promo Digunakan`      | medium    |
| Referral sukses                | `Referral Berhasil`    | medium    |
| Status change request          | `Permintaan Koreksi`   | high      |
| Bug / feedback masuk           | `Bug & Masukan`        | medium    |

Migration baru akan `CREATE OR REPLACE` 7 fungsi trigger:
`notify_staff_on_new_booking`, `notify_staff_new_registration`, `notify_payment_status_change`, dan 4 fungsi event lain.

Body diformat multi-baris dengan info lengkap:

```text
Booking Baru
Cabang Cirebon
Toyota Avanza B 1234 XYZ
Paket Servis Gold
2 menit yang lalu
```

Detail tambahan (branch, vehicle, plate, service, customer name) sudah tersedia di tabel `bookings`, `vehicles`, `branches`, `services`. Tinggal di-JOIN dan dirangkai di trigger. Metadata JSON disimpan lengkap supaya badge/grouping/route bekerja:

```jsonc
{
  "reference_id": "<booking_id>",
  "group_key": "booking",          // dipakai untuk grouping iOS/Android
  "branch": "cirebon",
  "vehicle": "Toyota Avanza B1234XYZ",
  "service_name": "Paket Servis Gold",
  "customer_name": "Budi Santoso",
  "redirect_to": "/dashboard/bookings/<booking_id>"
}
```

## 2. Upgrade Payload FCM v1 (edge function `dispatch-notification`)

`supabase/functions/dispatch-notification/index.ts` saat ini sudah kirim `notification + data + android + apns + webpush`. Akan ditingkatkan agar tampil persis seperti app native:

### Android block
```jsonc
android: {
  priority: "HIGH",          // "NORMAL" untuk medium/low
  notification: {
    icon: "ic_stat_notify",
    color: "#ff2b2b",
    channel_id: "<group_key>",      // booking, payment, customer, promo, referral, system
    tag: "<group_key>",             // grouping di status bar
    click_action: "FLUTTER_NOTIFICATION_CLICK",
    notification_priority: "PRIORITY_HIGH",
    default_sound: true,
    default_vibrate_timings: true,
    visibility: "PUBLIC"
  }
}
```

### iOS / APNS block
```jsonc
apns: {
  headers: { "apns-priority": "10", "apns-push-type": "alert" },
  payload: {
    aps: {
      alert: { title, body, subtitle: "<branch>" },
      sound: "default",
      badge: <unreadCount>,
      "mutable-content": 1,
      "thread-id": "<group_key>",   // grouping iOS Notification Center
      "interruption-level": "time-sensitive"   // booking & payment
    }
  }
}
```

### WebPush block
```jsonc
webpush: {
  headers: { Urgency: "high", TTL: "86400" },
  notification: {
    title, body,
    icon:  "<APP_ORIGIN>/pwa-192x192.png",
    badge: "<APP_ORIGIN>/badge-72.png",          // monokrom kecil untuk status bar
    image: "<APP_ORIGIN>/og-image.png",          // hero banner di Android Chrome
    tag:   "<group_key>",
    renotify: true,
    requireInteraction: <priority === "high">,
    actions: [{ action: "open", title: "Lihat" }, { action: "dismiss", title: "Tutup" }]
  },
  fcm_options: { link }
}
```

`badge_count` tetap dikirim di `data` agar `firebase-messaging-sw.js` dapat memanggil `navigator.setAppBadge()` saat browser/PWA tidak aktif.

## 3. Upgrade `public/firebase-messaging-sw.js`

* Tampilkan `image` jika ada (hero banner Android).
* Pasang `actions` `[Lihat, Tutup]`; handler `notificationclick` membuka `action_url` saat klik body atau tombol "Lihat", dan hanya `close()` saat "Tutup".
* `tag = group_key` (booking/payment/customer/…) sehingga banyak booking masuk = satu stack di status bar.
* Set `setAppBadge(badge_count)` setiap event `push` & `notificationclick`.
* Tambah event `pushsubscriptionchange` → auto re-register token.

## 4. Smart Click → Detail Page

Update `src/lib/notificationRoute.ts` + mirror di edge function:

```
booking         → /dashboard/bookings/<reference_id>
customer        → /dashboard/customers/<reference_id>
payment         → /dashboard/payments/<reference_id>
promo_used      → /dashboard/marketing/promos/<reference_id>
referral        → /dashboard/users/<reference_id>
status_change   → /dashboard/bookings/<reference_id>?tab=koreksi
bug_report      → /dashboard/feedback/<reference_id>
```

Tidak lagi jatuh ke `/dashboard`. Trigger menulis `action_url` lengkap di kolom `notifications.action_url`; edge function & SW pakai itu langsung.

## 5. Grouping (anti-spam)

* Android & iOS native: `tag` + `thread-id` = `group_key` → OS otomatis stack ("10 Booking Baru").
* Web PWA: SW men-`renotify` di tag yang sama; tidak muncul 10 banner.
* `NotificationCenter` tetap menyimpan semua baris lengkap (sudah jalan).

## 6. Notification Center & Badge

Sudah sinkron via `useAppBadge` + Realtime. Tidak ada perubahan UI; hanya pastikan setiap push baru:

1. Insert ke `public.notifications` (sudah).
2. Trigger setelah-insert memanggil `dispatch-notification` (sudah).
3. `useAppBadge` me-refresh angka di ikon (sudah).
4. SW men-set badge OS dari payload `badge_count` (ditambah di langkah 3).

## 7. Yang TIDAK Diubah

* Halaman `/dashboard/pwa-settings` & UI admin lainnya.
* Sistem token registration (sudah 6 device aktif).
* Sistem realtime, RLS, auth.
* Logo / branding.

## Catatan teknis

* Asset baru: `public/badge-72.png` (monokrom putih 72×72, alpha) untuk badge Android di status bar. Akan di-generate dari logo merah eksisting.
* `interruption-level: time-sensitive` di iOS hanya aktif untuk booking & payment.
* Channel Android (`channel_id`) tidak perlu di-register manual saat pakai webpush — FCM SDK akan buat default channel; nilai dipakai untuk grouping.
* Tidak ada perubahan secret; FCM_SERVICE_ACCOUNT_JSON yang sudah dipakai akan tetap dipakai.

## File yang akan disentuh

```
+ supabase/migrations/<ts>_notif_titles_and_payload.sql   (rewrite 7 trigger fns)
~ supabase/functions/dispatch-notification/index.ts        (payload v2 + click_action per type)
~ public/firebase-messaging-sw.js                          (actions, image, group, badge sync)
~ src/lib/notificationRoute.ts                             (deep-link per ID)
+ public/badge-72.png                                      (asset baru)
```

Tidak ada perubahan komponen UI / halaman.
