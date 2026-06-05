## Apa yang ingin Anda lihat

Pada gambar pertama: notifikasi banner di **lockscreen iPhone** (seperti WhatsApp "TIM SALES STROBAN — Okey pak").
Pada gambar kedua: **badge angka merah** di ikon STROBAN di home screen (seperti YouTube "384" atau Spotify "2").

Dua hal ini perlu kombinasi: **Web Push yang sampai ke iOS** + **Badging API**.

## Yang sudah ada

- FCM web-push, service worker `firebase-messaging-sw.js`, edge function `dispatch-notification`.
- Permission flow di Profile + dashboard PWA & Install.
- PWA installable (Anda sudah Add to Home Screen — terlihat ikon STROBAN).

## Yang akan ditambah

### 1. Notifikasi lockscreen iOS (gambar 1)

iOS 16.4+ memerlukan: PWA standalone + permission `granted` + payload web push yang valid. Sebenarnya sudah dibangun, **tetapi kemungkinan besar izin notifikasi belum diberikan di PWA STROBAN Anda**. Tambahan yang akan dibuat:

- **Auto-dialog "Aktifkan Notifikasi"** yang muncul sekali saat PWA dibuka pertama kali dalam mode standalone & belum granted (gesture-driven, satu tombol besar).
- **Tweak payload FCM** di `dispatch-notification`:
  - Kirim `webpush.headers` dengan `Urgency: high` + `TTL: 86400` agar iOS Web Push API tidak men-throttle.
  - Sertakan `webpush.notification.badge: <count>` agar iOS menampilkan badge bersamaan dengan notifikasi.
  - Title pakai brand "Sahabat Stroban", body sesuai isi notifikasi.

### 2. Badge angka di ikon home screen (gambar 2)

Pakai **Badging API** (`navigator.setAppBadge(n)` / `clearAppBadge()`). Didukung iOS 16.4+ PWA & Chrome Android PWA.

- Hook baru **`useAppBadge`**: berlangganan tabel `notifications` (count `is_read = false` untuk user), set badge tiap kali berubah via Supabase Realtime.
- Saat user membuka halaman notifikasi atau menandai sudah dibaca → `clearAppBadge()`.
- Saat push masuk di background (SW), `firebase-messaging-sw.js` juga memanggil `self.navigator.setAppBadge(prev+1)` agar badge ter-update walau app tertutup.
- Tambahan field `badge_count` opsional di payload FCM agar SW tahu nilai pastinya.

### 3. Diagnostik di Dashboard PWA & Install

Tambahkan baris baru di kartu **Status Perangkat Ini**:
- "Badging API didukung?" (cek `'setAppBadge' in navigator`).
- "Mode standalone aktif?" (cek `display-mode: standalone`).
- Tombol **Tes Badge** (set badge = 5 lalu auto-clear 10 detik).

## Yang TIDAK diubah

- Struktur SW, manifest, RLS, alur booking/payment.
- Layout banner install / Profile UI lainnya.
- iOS lockscreen tetap pakai suara channel sistem (batasan Web Push) — pengaturan ringtone tetap berlaku di foreground.

## Catatan penting (jujur, tanpa hype)

- **iOS** hanya memunculkan badge & notifikasi lockscreen untuk PWA jika dibuka **dari ikon home screen** (bukan dari Safari biasa).
- Jika setelah ini badge/notif belum muncul: cek **Settings → Notifications → STROBAN** di iPhone Anda — pastikan "Allow Notifications", "Lock Screen", "Banners", dan "Badges" aktif. Akan dijelaskan via tooltip di dashboard.
- iOS tidak akan langsung memunculkan dialog izin — harus dari gesture user (tap tombol). Itu sebabnya kita pakai auto-dialog one-tap.
