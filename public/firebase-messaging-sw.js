/* Firebase Cloud Messaging service worker.
 * Handles background web push and routes notification taps to the right SPA URL.
 * This worker is independent from any app-shell PWA service worker.
 */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

const FB_CONFIG = {
  apiKey: "AIzaSyBsU6hli_s7RoLaiblCW6cjxgNInCB28vs",
  authDomain: "bengkel-stroban.firebaseapp.com",
  projectId: "bengkel-stroban",
  storageBucket: "bengkel-stroban.firebasestorage.app",
  messagingSenderId: "447666256502",
  appId: "1:447666256502:web:e3a2b0a308b468d09cbd57",
};
let NOTIF_CONFIG = {
  enabled: true,
  iconUrl: null,
  vibrate: true,
  ringtone: "default",
  soundUrl: null,
};

self.addEventListener("message", (event) => {
  if (event.data?.type === "NOTIF_CONFIG" && event.data.config) {
    NOTIF_CONFIG = { ...NOTIF_CONFIG, ...event.data.config };
    return;
  }
});

try {
  if (!self.firebase.apps.length) {
    self.firebase.initializeApp(FB_CONFIG);
  }
  const messaging = self.firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    if (!NOTIF_CONFIG.enabled) return;
    const title = payload.notification?.title || payload.data?.title || "Notifikasi";
    const body = payload.notification?.body || payload.data?.body || "";
    const route = payload.data?.route || payload.fcmOptions?.link || "/";
    const refId = payload.data?.reference_id || payload.data?.notification_id || route;
    try {
      const badgeCount = Number(payload.data?.badge_count);
      if (!Number.isNaN(badgeCount) && badgeCount >= 0 && "setAppBadge" in self.navigator) {
        self.navigator.setAppBadge(badgeCount).catch(() => {});
      }
    } catch {}
    self.registration.showNotification(title, {
      body,
      icon: NOTIF_CONFIG.iconUrl || "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: NOTIF_CONFIG.vibrate ? [200, 100, 200] : [],
      tag: String(refId),
      renotify: true,
      requireInteraction: false,
      data: { route, ...(payload.data || {}) },
    });
  });
} catch (e) {
  console.error("FB init failed", e);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.route || "/";
  const url = new URL(route, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          client.postMessage({ type: "push-navigate", route });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("install", () => self.skipWaiting());
// Intentionally NOT calling clients.claim() — claiming would steal control
// of the page from the app-shell SW and cause a reload loop.

/**
 * Raw Web Push fallback. Firebase's onBackgroundMessage wrapper is unreliable
 * on iOS after device restarts (firebase-js-sdk #8444). Listening to the raw
 * `push` event guarantees the notification is shown on the lock screen even
 * when the FCM wrapper silently fails. Guarded against double-show: if FCM
 * already showed a notification with the same tag, the browser dedupes.
 */
self.addEventListener("push", (event) => {
  if (!NOTIF_CONFIG.enabled) return;
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || "Notifikasi";
  const body = n.body || d.body || "";
  const route = d.route || (payload.fcmOptions && payload.fcmOptions.link) || "/";
  const refId = d.reference_id || d.notification_id || route;
  try {
    const badgeCount = Number(d.badge_count);
    if (!Number.isNaN(badgeCount) && badgeCount >= 0 && "setAppBadge" in self.navigator) {
      self.navigator.setAppBadge(badgeCount).catch(() => {});
    }
  } catch {}
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: NOTIF_CONFIG.iconUrl || "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: NOTIF_CONFIG.vibrate ? [200, 100, 200] : [],
      tag: String(refId),
      renotify: true,
      requireInteraction: false,
      data: { route, ...d },
    }),
  );
});