/* Firebase Cloud Messaging service worker.
 * Handles background web push and routes notification taps to the right SPA URL.
 * This worker is independent from any app-shell PWA service worker.
 */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Filled at runtime by the client (postMessage from useWebPush) so we don't
// hard-code project credentials in this file. Falls back to placeholders.
let FB_CONFIG = null;

self.addEventListener("message", (event) => {
  if (event.data?.type === "FB_CONFIG" && event.data.config) {
    FB_CONFIG = event.data.config;
    try {
      if (!self.firebase.apps.length) {
        self.firebase.initializeApp(FB_CONFIG);
        const messaging = self.firebase.messaging();
        messaging.onBackgroundMessage((payload) => {
          const title = payload.notification?.title || payload.data?.title || "Notifikasi";
          const body = payload.notification?.body || payload.data?.body || "";
          const route = payload.data?.route || payload.fcmOptions?.link || "/";
          self.registration.showNotification(title, {
            body,
            icon: "/placeholder.svg",
            badge: "/placeholder.svg",
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