## Tujuan
Mengganti VAPID key yang tidak valid dengan key asli dari Firebase Console sehingga `getToken()` berhasil di iPhone PWA dan "Token Terdaftar" naik menjadi ≥1.

## Key Asli (terverifikasi dari teks user)
```
BJUC2eMbbvSzfvMFQKYAIa9NPJlZxy0joed5CLKee7KAJ7QPoNbEn6XPrrdLZmtDPJy6dYV5M9ArIK54oAQW25k
```
Panjang 87 karakter, diawali `B` → format P-256 uncompressed valid.

## Perubahan

1. **`src/hooks/useWebPush.ts`**
   - Ganti konstanta `VAPID_PUBLIC_KEY` dari key lama (43 chars) ke key baru di atas.
   - Biarkan `validateVapidKey()` tetap aktif sebagai pengaman.
   - Pastikan `registerWebPushNow()` memanggil `getToken({ vapidKey, serviceWorkerRegistration })` dengan key baru.

2. **Tidak ada perubahan lain**
   - `firebase-messaging-sw.js`, `PwaSettingsManager.tsx`, edge function `register-push-token` & `dispatch-notification` sudah benar dari iterasi sebelumnya.
   - Banner peringatan di Admin akan otomatis hilang begitu `validateVapidKey()` lulus.

## Verifikasi setelah build
1. Buka Admin → PWA Settings di desktop:
   - Banner merah "VAPID invalid" hilang.
   - Klik "Aktifkan & Daftarkan Perangkat" → toast sukses → counter "Token Terdaftar" bertambah.
2. Di iPhone (iOS 16.4+):
   - Install PWA dari Safari → Add to Home Screen.
   - Buka dari Home Screen (mode standalone).
   - Tap "Allow Notifications" → token otomatis terbuat & tersimpan ke `push_tokens`.
3. Trigger booking baru → dispatch-notification mengirim ke FCM → notif muncul di lockscreen iPhone.

## Catatan
- Tidak ada perubahan skema DB, edge function, atau bisnis logic.
- Tidak menyentuh file auto-generated atau Capacitor native config.
