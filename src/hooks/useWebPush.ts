import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Reads optional web push config from build env. If missing, web push is disabled.
const FB_CONFIG = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};
const VAPID_KEY = import.meta.env.VITE_FB_VAPID_KEY as string | undefined;

export function isWebPushConfigured() {
  return Boolean(FB_CONFIG.apiKey && FB_CONFIG.projectId && FB_CONFIG.messagingSenderId && FB_CONFIG.appId && VAPID_KEY);
}

/**
 * Registers the browser as a push recipient via Firebase Cloud Messaging.
 * - Requires Notification permission already granted by the user.
 * - Stores the FCM token in `push_tokens` so the dispatcher can target this device.
 * - SPA-navigates when the messaging SW posts a `push-navigate` message.
 */
export function useWebPush() {
  const { user } = useAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!user || !isWebPushConfigured()) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (registeredFor.current === user.id) return;

    let cancelled = false;
    (async () => {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const { getMessaging, getToken, onMessage, isSupported } = await import("firebase/messaging");
        if (!(await isSupported())) return;

        const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        await navigator.serviceWorker.ready;

        // Hand the config to the SW so background messages work
        reg.active?.postMessage({ type: "FB_CONFIG", config: FB_CONFIG });

        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        });
        if (cancelled || !token) return;

        await supabase
          .from("push_tokens")
          .upsert({ user_id: user.id, token, platform: "web" }, { onConflict: "token" });

        registeredFor.current = user.id;

        // Foreground messages: show a tap-able toast / native notification
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || (payload.data as any)?.title || "Notifikasi";
          const body = payload.notification?.body || (payload.data as any)?.body || "";
          const route = (payload.data as any)?.route || "/";
          if (Notification.permission === "granted") {
            const n = new Notification(title, { body, data: { route } });
            n.onclick = () => {
              window.dispatchEvent(new CustomEvent("push-navigate", { detail: { route } }));
              n.close();
              window.focus();
            };
          }
        });

        // SW → page navigation bridge
        navigator.serviceWorker.addEventListener("message", (e) => {
          if (e.data?.type === "push-navigate" && e.data.route) {
            window.dispatchEvent(new CustomEvent("push-navigate", { detail: { route: e.data.route } }));
          }
        });
      } catch (e) {
        console.warn("[useWebPush] registration failed", e);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);
}