import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Firebase web config — values are PUBLIC by design (protected via Firebase
// domain restrictions + VAPID, not secrecy). Safe to hardcode.
const FB_CONFIG = {
  apiKey: "AIzaSyBsU6hli_s7RoLaiblCW6cjxgNInCB28vs",
  authDomain: "bengkel-stroban.firebaseapp.com",
  projectId: "bengkel-stroban",
  storageBucket: "bengkel-stroban.firebasestorage.app",
  messagingSenderId: "447666256502",
  appId: "1:447666256502:web:e3a2b0a308b468d09cbd57",
};
const VAPID_KEY = "L2t-UwocJyjiDazjAUkp0dYLzC8GJ_3jBeqbiFwPeeQ";

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
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  // Re-read permission on tab focus + custom "notif-permission-granted" event so
  // the registration effect can re-run instantly after the banner grants permission.
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    const sync = () => setPermission(Notification.permission);
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    window.addEventListener("notif-permission-granted", sync);
    document.addEventListener("visibilitychange", onVis);
    // Some browsers expose permission change via Permissions API
    let permStatus: PermissionStatus | null = null;
    try {
      // @ts-ignore
      navigator.permissions?.query?.({ name: "notifications" }).then((s: PermissionStatus) => {
        permStatus = s;
        s.addEventListener("change", sync);
      }).catch(() => {});
    } catch {}
    return () => {
      window.removeEventListener("notif-permission-granted", sync);
      document.removeEventListener("visibilitychange", onVis);
      try { permStatus?.removeEventListener("change", sync); } catch {}
    };
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!user || !isWebPushConfigured()) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (permission !== "granted") {
      console.log("[useWebPush] skip: permission=", permission);
      return;
    }
    if (registeredFor.current === user.id) return;

    let cancelled = false;
    (async () => {
      try {
        console.log("[useWebPush] init");
        const { initializeApp, getApps } = await import("firebase/app");
        const { getMessaging, getToken, onMessage, isSupported } = await import("firebase/messaging");
        if (!(await isSupported())) {
          console.warn("[useWebPush] firebase messaging not supported in this browser");
          window.dispatchEvent(new CustomEvent("webpush-status", { detail: { status: "unsupported" } }));
          return;
        }

        const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
        console.log("[useWebPush] sw-register");
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        // Hand the config to the SW so background messages work.
        // First-install: reg.active may be null; post to whichever worker exists,
        // and re-post when the installing worker becomes activated or controller changes.
        const postConfig = () => {
          const targets = [reg.installing, reg.waiting, reg.active, navigator.serviceWorker.controller];
          for (const w of targets) {
            try { w?.postMessage({ type: "FB_CONFIG", config: FB_CONFIG }); } catch {}
          }
        };
        postConfig();
        if (reg.installing) {
          reg.installing.addEventListener("statechange", (e: any) => {
            if (e.target?.state === "activated") postConfig();
          });
        }
        navigator.serviceWorker.addEventListener("controllerchange", postConfig);

        console.log("[useWebPush] get-token");
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        });
        if (cancelled) return;
        if (!token) {
          console.warn("[useWebPush] empty token (permission/SW/VAPID issue)");
          window.dispatchEvent(new CustomEvent("webpush-status", { detail: { status: "error", reason: "empty_token" } }));
          return;
        }
        console.log("[useWebPush] upsert token len=", token.length);

        const { error } = await supabase.functions.invoke("register-push-token", {
          body: {
            token,
            platform: "web",
            device_type:
              typeof navigator !== "undefined"
                ? /iphone|ipad|ipod/i.test(navigator.userAgent)
                  ? "iphone"
                  : /android/i.test(navigator.userAgent)
                    ? "android"
                    : /macintosh|mac os x/i.test(navigator.userAgent)
                      ? "mac"
                      : /windows/i.test(navigator.userAgent)
                        ? "windows"
                        : "web"
                : "web",
            last_active: new Date().toISOString(),
          },
        });
        if (error) {
          console.error("[useWebPush] upsert failed", error);
          window.dispatchEvent(new CustomEvent("webpush-status", { detail: { status: "error", reason: error.message } }));
          return;
        }

        registeredFor.current = user.id;
        window.dispatchEvent(new CustomEvent("webpush-status", { detail: { status: "success" } }));

        // Foreground messages: show a tap-able toast / native notification
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || (payload.data as any)?.title || "Notifikasi";
          const body = payload.notification?.body || (payload.data as any)?.body || "";
          const route = (payload.data as any)?.route || "/";
          // Notify NotificationBridge so it can play the chosen ringtone / vibrate.
          window.dispatchEvent(new CustomEvent("fcm-foreground", { detail: { title, body, route } }));
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
        console.error("[useWebPush] registration failed", e);
        window.dispatchEvent(new CustomEvent("webpush-status", { detail: { status: "error", reason: (e as any)?.message || String(e) } }));
      }
    })();

    return () => { cancelled = true; };
  }, [user, permission]);
}