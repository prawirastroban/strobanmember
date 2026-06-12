## Diagnosis (kenapa token masih 0)

Audit menemukan 5 sebab nyata, bukan karena DB:

1. **Registrasi web push tidak terkait gesture user.** `useWebPush` memanggil `getToken()` di dalam `useEffect` setelah permission `granted`. Pada iPhone PWA standalone, Safari kerap menolak/mengembalikan token kosong jika `getToken` tidak dipanggil dalam rantai tap user. Akibatnya saat user baru mengaktifkan izin dari banner / Settings iPhone, kode coba register tanpa gesture → token tidak pernah dibuat.
2. **Tidak ada tombol "Aktifkan & Daftarkan" yang sekaligus minta izin + register dalam satu tap.** Banner hanya `requestPermission`, lalu mengandalkan event/visibility untuk memicu register. Di iOS PWA event ini sering tidak terpicu.
3. **Native iOS (Capacitor) saat ini memakai token APNs mentah.** `@capacitor/push-notifications` di iOS mengembalikan APNs device token (hex), padahal `dispatch-notification` mengirim via FCM HTTP v1 yang butuh **FCM registration token**. Hasilnya server akan tetap menolak meski token tersimpan.
4. **Status "Token Terdaftar: 0" muncul karena belum ada satupun device yang berhasil melalui jalur di atas** (DB sudah kosong, RPC sudah benar, GRANT sudah benar — sudah dicek).
5. **PWA harus di-install dari domain produksi (`bengkelstroban.com`), bukan dari URL preview.** Token FCM terikat ke origin tempat SW dipasang. Preview URL akan menyimpan token tapi tidak akan diakui oleh PWA yang di-install dari domain lain.

Secrets `FCM_SERVICE_ACCOUNT_JSON` dan `FCM_PROJECT_ID` sudah ada — backend siap.

## Yang akan dibangun

### A. Fix jalur registrasi PWA (Safari/Chrome iOS, Android, desktop)

- Pecah `useWebPush` jadi 2 mode:
  - **Auto** (existing): jalan saat `permission === "granted"` (untuk Android/desktop yang sudah granted dari sebelumnya).
  - **Manual gesture** (baru): fungsi `registerNow()` yang melakukan `Notification.requestPermission()` + `initializeApp` + `register SW` + `getToken` + upsert via edge function — semuanya dalam satu tap, agar iOS Safari mengizinkan.
- Tambah retry singkat dan log error spesifik (permission, SW state, VAPID, token kosong) ke `push_delivery_logs` event `device_sync_failed`.

### B. UI prompt yang gesture-bound (TANPA mengubah desain global)

- `StandaloneNotifPrompt` (sudah ada, modal "Aktifkan Notifikasi") → tombol "Aktifkan" memanggil `registerNow()` baru (sebelumnya hanya `requestPermission`).
- `NotificationPermissionBanner` → tombol "Aktifkan" memanggil `registerNow()`.
- `PwaSettingsManager` (panel Audit) → tambah tombol kecil "Daftarkan perangkat ini sekarang" yang memanggil `registerNow()` lalu refresh audit.

Semua hanya menambah handler ke tombol yang sudah ada — tidak ada perubahan layout.

### C. Fix native iOS (Capacitor) supaya pakai FCM token, bukan APNs token

- Tambah dependency `@capacitor-firebase/messaging` (resmi dari Capawesome) untuk iOS/Android.
- `usePushNotifications` di-update: setelah `PushNotifications.register()` berhasil di iOS, panggil `FirebaseMessaging.getToken()` untuk mendapat FCM token yang valid, lalu kirim ke `register-push-token` dengan `platform: "ios"`. Android tetap dapat FCM token via plugin ini juga.
- Tidak mengubah listener foreground/tap yang sudah ada.

### D. Instruksi non-kode (akan ditampilkan di chat, bukan di UI)

- User harus **install PWA dari `https://www.bengkelstroban.com`** (bukan dari URL preview Lovable), lalu buka PWA → login → tap tombol "Aktifkan Notifikasi". Inilah satu-satunya cara iPhone PWA akan menyimpan token.
- Untuk native iOS, perlu `npx cap sync ios` + build via Xcode + APNs Auth Key sudah ter-upload di Firebase Console (verifikasi cepat).

### E. Verifikasi end-to-end (yang akan saya jalankan setelah implementasi)

1. Setelah deploy, panggil `dispatch-notification` lewat curl untuk user uji → cek `push_delivery_logs` ada baris `trigger`/`sent`/`failed` dengan status FCM.
2. Cek RPC `get_pwa_push_audit()` mengembalikan `active_tokens >= 1` setelah Anda menekan tombol di iPhone.
3. Daftar event yang akan dipastikan tetap memanggil `dispatch-notification` (sudah dipakai via tabel `notifications` + trigger): booking baru, booking dikonfirmasi, customer baru, pembayaran berhasil, promo digunakan, referral berhasil. Tidak ada perubahan trigger — hanya pengecekan.

## Yang TIDAK diubah

- Tidak ada perubahan UI/desain, warna, layout, atau flow bisnis.
- Tidak menyentuh tabel `notifications`, trigger DB, atau alur booking/payment/referral.
- Tidak menambah/menghapus permission OS lain.
- Tidak mengganti library FCM web.

## Detail teknis

- File yang akan disentuh:
  - `src/hooks/useWebPush.ts` — ekspor `registerWebPushNow()` (gesture-bound), pertahankan auto-register.
  - `src/components/StandaloneNotifPrompt.tsx`, `src/components/NotificationPermissionBanner.tsx` — panggil `registerWebPushNow()` di handler tombol.
  - `src/components/admin/PwaSettingsManager.tsx` — tombol "Daftarkan perangkat ini" + tampilkan alasan kegagalan terakhir.
  - `src/hooks/usePushNotifications.ts` — pakai `@capacitor-firebase/messaging` untuk ambil FCM token di iOS/Android.
  - `package.json` — tambah `@capacitor-firebase/messaging`.
  - `supabase/functions/register-push-token/index.ts` — tambah log `device_sync_failed` saat upsert gagal (sudah log sukses).
- Tidak ada migrasi baru: tabel `push_tokens` dan `push_delivery_logs` sudah cukup.

## Batasan iPhone yang harus dipahami

- **PWA iPhone**: hanya bisa terima push jika di-install ke Home Screen dari Safari pada iOS 16.4+, lalu user memberi izin saat aplikasi dibuka dalam mode standalone, dan registrasi dilakukan dalam tap user. Origin install harus sama dengan origin token (gunakan custom domain produksi).
- **Native iOS**: butuh build asli (Xcode), APNs Auth Key di Firebase Console, dan device fisik / TestFlight. Lovable preview tidak bisa memvalidasi ini — verifikasi akhir dilakukan oleh user di iPhone.
