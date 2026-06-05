/* Firebase Cloud Messaging service worker.
 * Handles background web push and routes notification taps to the right SPA URL.
 * This worker is independent from any app-shell PWA service worker.
 */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

let FB_CONFIG = null;
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
  if (event.data?.type === "FB_CONFIG" && event.data.config) {
    FB_CONFIG = event.data.config;
    try {
      if (!self.firebase.apps.length) {
        self.firebase.initializeApp(FB_CONFIG);
        const messaging = self.firebase.messaging();
        messaging.onBackgroundMessage((payload) => {
          if (!NOTIF_CONFIG.enabled) return;
          const title = payload.notification?.title || payload.data?.title || "Notifikasi";
          const body = payload.notification?.body || payload.data?.body || "";
          const route = payload.data?.route || payload.fcmOptions?.link || "/";
          const refId = payload.data?.reference_id || payload.data?.notification_id || route;
          self.registration.showNotification(title, {
            body,
            icon: NOTIF_CONFIG.iconUrl || "/placeholder.svg",
            badge: "/placeholder.svg",
            vibrate: NOTIF_CONFIG.vibrate ? [200, 100, 200] : [],
            tag: String(refId),
            renotify: true,
            requireInteraction: false,
            data: { route, ...(payload.data || {}) },
          });
        });
      }
    } catch (e) {
      console.error("FB init failed", e);
    }
  }
});

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
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));