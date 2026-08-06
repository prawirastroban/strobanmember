---
name: PWA Install & Push Settings
description: Install banner controlled by pwa_settings, FCM web-push with per-user ringtone/vibrate preferences (user_notification_prefs), device status + test notification card in /dashboard/pwa-settings, foreground ringtone via NotificationBridge.
type: feature
---
- DB: `pwa_settings` (singleton id=1) extended with notification_enabled, notification_icon_url, notification_sound_url, default_ringtone, default_vibrate. `user_notification_prefs` (user_id PK) overrides ringtone/vibrate/enabled per user.
- Bucket: `pwa-assets` public read, admin write.
- SW: `public/firebase-messaging-sw.js` receives `NOTIF_CONFIG` postMessage; uses icon, vibrate [200,100,200], tag=reference_id, renotify=true.
- Hooks: `usePwaSettings` (realtime global), `useNotificationPrefs` (merges global+user, pushes to SW), `useWebPush` (FCM token + onMessage dispatches `fcm-foreground` window event).
- Components: `NotificationBridge` (global, plays ringtone foreground), `NotificationPrefsCard` (user-facing on Profile), `PwaSettingsManager` (admin: device status, test notification, global notif config, banner config, 30d stats).
- Banner hidden when `display-mode: standalone` (PWA installed). Dashboard shows device install status badge.
- Token registration MUST be gesture-bound on iPhone PWA: `registerWebPushNow()` from `useWebPush` runs `requestPermission + initializeApp + SW register + getToken + register-push-token invoke` inside one user tap. Called from `NotificationPermissionBanner`, `StandaloneNotifPrompt`, and the "Aktifkan & Daftarkan Perangkat" button on `/dashboard/pwa-settings`. iPhone PWA must be installed from the production domain (custom domain) for tokens to apply.
- Native iOS via Capacitor uses `@capacitor-firebase/messaging` (`FirebaseMessaging.getToken()`) to upgrade the APNs device token to an FCM registration token before sending to `register-push-token`. Required because `dispatch-notification` uses FCM HTTP v1.
- `register-push-token` accepts optional `fail_reason` payload and logs `device_sync_failed` to `push_delivery_logs` so the admin audit shows registration failures without storing bogus tokens.
- Anti-duplicate (Aug 2026): `dispatch-notification` only sends to tokens with `invalidated_at IS NULL` and dedupes to the newest token per (platform, device_type). SW uses a single dedupe key `notif:<notification_id>` (60s window) shared by `onBackgroundMessage` and the raw `push` handler, plus a `getNotifications({tag})` check. DB trigger `trg_notifications_dedupe_recent` skips identical notification inserts within 30s. Migration invalidated superseded tokens (`superseded_by_newer_device_token`).
