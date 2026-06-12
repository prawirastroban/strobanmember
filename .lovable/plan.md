## Tujuan
Memperbaiki push notification PWA iPhone agar alur berikut berhasil tanpa input tambahan selain satu kali tap izin:
- install PWA dari domain produksi
- tap "Aktifkan & Daftarkan Perangkat"
- token FCM valid dibuat
- token otomatis tersimpan ke database
- "Token Terdaftar" menjadi minimal 1
- notifikasi booking/customer/payment dapat dikirim ke lock screen saat app tertutup

## Hasil audit
Masalah utama saat ini ada di konfigurasi Firebase Messaging web, bukan di trigger notifikasi atau tabel token.

1. **VAPID key yang dipakai di frontend tidak valid untuk Web Push.**
   - `src/hooks/useWebPush.ts` memakai `L2t-UwocJyjiDazjAUkp0dYLzC8GJ_3jBeqbiFwPeeQ`
   - Format ini terlalu pendek untuk public key P-256 Web Push, sehingga cocok dengan error:
     `applicationServerKey must contain a valid P-256 public key`
   - Selama ini `getToken()` gagal sebelum token bisa dibuat atau disimpan.

2. **Firebase config antara app dan service worker sudah konsisten.**
   - `src/hooks/useWebPush.ts` dan `public/firebase-messaging-sw.js` memakai project Firebase yang sama.
   - Jadi akar error bukan mismatch project Firebase.

3. **Backend dispatch sudah siap, tapi tergantung token ada di `push_tokens`.**
   - `dispatch-notification` mengirim via FCM HTTP v1 dan akan skip jika `push_tokens` kosong.
   - Booking/customer/payment trigger sudah ada, tetapi semuanya gagal kirim push jika token belum tersimpan.

4. **iPhone PWA tetap punya batasan platform.**
   - Harus iOS 16.4+
   - Harus install ke Home Screen
   - Permission harus diminta dalam user gesture
   - Untuk reliability iPhone, background handling perlu memakai jalur native `push` event di service worker, bukan hanya wrapper FCM `onBackgroundMessage`

## Rencana implementasi

### 1) Perbaiki konfigurasi VAPID di jalur web push
- Ganti VAPID key yang sekarang dengan public key Firebase Web Push yang valid.
- Tambahkan validasi format sederhana di `useWebPush` agar kegagalan seperti ini terbaca jelas di log/status, bukan gagal diam-diam.
- Pastikan `getToken()` selalu menerima `vapidKey` valid dan `serviceWorkerRegistration` yang aktif.

### 2) Keras-kan alur registrasi token iPhone PWA
- Audit dan rapikan `registerWebPushNow()` agar urutannya tetap satu gesture:
  - `Notification.requestPermission()`
  - register service worker messaging
  - tunggu worker siap
  - `getToken()`
  - invoke `register-push-token`
- Pastikan hasil sukses memicu refresh audit/token count secara langsung.
- Pastikan jalur gagal menulis alasan kegagalan yang spesifik ke log sinkronisasi perangkat.

### 3) Perkuat service worker untuk background push iPhone
- Audit `public/firebase-messaging-sw.js` agar tetap memakai config Firebase produksi yang sama.
- Tambahkan fallback handler berbasis event `push` native selain `onBackgroundMessage`, supaya kasus iPhone yang bermasalah pada wrapper FCM tetap bisa menampilkan notifikasi background/lockscreen.
- Pastikan click action tetap membuka route SPA yang benar.

### 4) Verifikasi panel audit dan auto-save token
- Pastikan tombol `Aktifkan & Daftarkan Perangkat` benar-benar cukup satu tap dan tidak butuh langkah tambahan setelah permission granted.
- Pastikan setelah token sukses dibuat, row `push_tokens` ter-upsert dan panel audit langsung membaca jumlah terbaru.
- Pastikan status error lebih informatif jika yang gagal adalah permission, VAPID, SW readiness, atau token kosong.

### 5) Validasi alur kirim notifikasi nyata
- Verifikasi bahwa jalur `notifications` → `dispatch-notification` tetap memakai FCM production config.
- Pastikan booking/customer/payment tetap mengalir ke dispatcher yang sama tanpa mengubah bisnis logic yang sudah ada.
- Fokus validasi pada syarat akhir: begitu token terdaftar, notifikasi nyata bisa dikirim ke device iPhone.

## File yang kemungkinan disentuh
- `src/hooks/useWebPush.ts`
- `public/firebase-messaging-sw.js`
- `src/components/admin/PwaSettingsManager.tsx`
- kemungkinan kecil: `src/components/NotificationPermissionBanner.tsx` dan/atau `src/components/StandaloneNotifPrompt.tsx` bila perlu penyelarasan status/log

## Yang tidak akan diubah
- Tidak mengubah schema database yang sudah berjalan
- Tidak menghapus notifikasi existing
- Tidak mengubah flow booking/customer/payment/referral
- Tidak memakai dummy token atau mock data
- Tidak mengganti project Firebase ke project lain

## Catatan penting
Anda mengirim kembali VAPID key yang sama dengan yang sekarang ada di kode. Berdasarkan formatnya, itu bukan public key P-256 Web Push yang valid. Jadi saat implementasi saya akan memperlakukan ini sebagai akar bug dan memperbaiki jalur kode agar validasi serta error handling-nya tegas. Jika setelah itu ternyata key Firebase yang benar belum ada di project Firebase, target iPhone tidak akan bisa tercapai sampai key pair Web Push yang valid tersedia di Firebase Cloud Messaging.