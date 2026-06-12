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
const VAPID_KEY = "BJUC2eMbbvSzfvMFQKYAIa9NPJlZxy0joed5CLKee7KAJ7QPoNbEn6XPrrdLZmtDPJy6dYV5M9ArIK54oAQW25k";

export function isWebPushConfigured() {
  return Boolean(FB_CONFIG.apiKey && FB_CONFIG.projectId && FB_CONFIG.messagingSenderId && FB_CONFIG.appId && VAPID_KEY);
}

/**
 * Validate that VAPID key is a base64url-encoded P-256 uncompressed public key.
 * Real Firebase Web Push certificates decode to exactly 65 bytes and start with 0x04.
 * If this check fails, getToken() will throw:
 *   "applicationServerKey must contain a valid P-256 public key"
 */
export function validateVapidKey(key: string): { ok: boolean; reason?: string } {
  if (!key) return { ok: false, reason: "vapid_empty" };
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return { ok: false, reason: "vapid_not_base64url" };
  try {
    const b64 = key.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    if (bin.length !== 65) return { ok: false, reason: `vapid_wrong_length_${bin.length}_expected_65` };
    if (bin.charCodeAt(0) !== 0x04) return { ok: false, reason: "vapid_not_uncompressed_p256" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: "vapid_decode_failed:" + (e?.message || "unknown") };
  }
}

export function getWebPushVapidStatus(): { ok: boolean; reason?: string; length: number } {
  const v = validateVapidKey(VAPID_KEY);
  return { ...v, length: VAPID_KEY.length };
}

function deviceType(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "iphone";
  if (/android/i.test(ua)) return "android";
  if (/macintosh|mac os x/i.test(ua)) return "mac";
  if (/windows/i.test(ua)) return "windows";
  return "web";
}

export interface RegisterResult {
  ok: boolean;
  status: "success" | "denied" | "unsupported" | "error" | "no_user";
  reason?: string;
  token?: string;
}

/**
 * Gesture-bound web push registration. MUST be called inside a user tap
 * handler on iOS Safari/PWA. Performs permission prompt (if needed),
 * Firebase init, SW register, getToken, and upsert to backend in one chain.
 */
export async function registerWebPushNow(): Promise<RegisterResult> {
  const fire = (detail: any) =>
    window.dispatchEvent(new CustomEvent("webpush-status", { detail }));

  try {
    if (Capacitor.isNativePlatform()) {
      return { ok: false, status: "unsupported", reason: "native_platform" };
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      fire({ status: "unsupported", reason: "browser" });
      return { ok: false, status: "unsupported", reason: "browser" };
    }
    if (!isWebPushConfigured()) {
      fire({ status: "unsupported", reason: "no_fb_config" });
      return { ok: false, status: "unsupported", reason: "no_fb_config" };
    }

    // Hard-fail early on bad VAPID — otherwise the browser throws an opaque
    // "applicationServerKey must contain a valid P-256 public key" from getToken.
    const vapidCheck = validateVapidKey(VAPID_KEY);
    if (!vapidCheck.ok) {
      const reason = `invalid_vapid:${vapidCheck.reason}`;
      console.error("[registerWebPushNow] " + reason, { len: VAPID_KEY.length });
      fire({ status: "error", reason });
      await supabase.functions.invoke("register-push-token", {
        body: { token: "ERR_VAPID_" + Date.now(), platform: "web", device_type: deviceType(), fail_reason: reason.slice(0, 200) },
      }).catch(() => {});
      return { ok: false, status: "error", reason };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      fire({ status: "error", reason: "no_user" });
      return { ok: false, status: "no_user", reason: "Please login first" };
    }

    // Ask permission INSIDE the user gesture (critical for iOS PWA)
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    if (perm !== "granted") {
      fire({ status: "denied", reason: perm });
      return { ok: false, status: "denied", reason: perm };
    }

    const { initializeApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) {
      fire({ status: "unsupported", reason: "fcm_unsupported" });
      return { ok: false, status: "unsupported", reason: "fcm_unsupported" };
    }

    const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    // Wait briefly for SW to become active so getToken doesn't race.
    if (!reg.active) {
      await new Promise<void>((resolve) => {
        const sw = reg.installing || reg.waiting;
        if (!sw) return resolve();
        const onState = () => {
          if ((sw as ServiceWorker).state === "activated") {
            sw.removeEventListener("statechange", onState);
            resolve();
          }
        };
        sw.addEventListener("statechange", onState);
        setTimeout(() => resolve(), 4000);
      });
    }

    const messaging = getMessaging(app);
    let token: string | null = null;
    try {
      token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    } catch (e: any) {
      const reason = e?.message || String(e);
      console.error("[registerWebPushNow] getToken failed", e);
      fire({ status: "error", reason });
      await supabase.functions.invoke("register-push-token", {
        body: { token: "ERR_GETTOKEN_" + Date.now(), platform: "web", device_type: deviceType(), fail_reason: reason.slice(0, 200) },
      }).catch(() => {});
      return { ok: false, status: "error", reason };
    }

    if (!token) {
      fire({ status: "error", reason: "empty_token" });
      return { ok: false, status: "error", reason: "empty_token" };
    }

    const { error } = await supabase.functions.invoke("register-push-token", {
      body: {
        token,
        platform: "web",
        device_type: deviceType(),
        last_active: new Date().toISOString(),
      },
    });
    if (error) {
      fire({ status: "error", reason: error.message });
      return { ok: false, status: "error", reason: error.message };
    }

    fire({ status: "success" });
    return { ok: true, status: "success", token };
  } catch (e: any) {
    const reason = e?.message || String(e);
    console.error("[registerWebPushNow] failed", e);
    fire({ status: "error", reason });
    return { ok: false, status: "error", reason };
  }
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
      const result = await registerWebPushNow();
      if (cancelled) return;
      if (result.ok) registeredFor.current = user.id;

      // Foreground onMessage + SW navigation bridge — only set up once on success.
      if (result.ok) {
        try {
          const { initializeApp, getApps } = await import("firebase/app");
          const { getMessaging, onMessage } = await import("firebase/messaging");
          const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
          const messaging = getMessaging(app);
          onMessage(messaging, (payload) => {
            const title = payload.notification?.title || (payload.data as any)?.title || "Notifikasi";
            const body = payload.notification?.body || (payload.data as any)?.body || "";
            const route = (payload.data as any)?.route || "/";
            window.dispatchEvent(new CustomEvent("fcm-foreground", { detail: { title, body, route } }));
            // Intentionally DO NOT call `new Notification(...)` here.
            // When a push arrives while the tab is foregrounded, the service
            // worker's `push` listener also fires and shows the notification.
            // Calling `new Notification` would produce a duplicate banner.
            // Foreground UX (toast + sound) is handled by NotificationBridge.
          });
          navigator.serviceWorker.addEventListener("message", (e) => {
            if (e.data?.type === "push-navigate" && e.data.route) {
              window.dispatchEvent(new CustomEvent("push-navigate", { detail: { route: e.data.route } }));
            }
          });
        } catch (e) {
          console.warn("[useWebPush] foreground listener setup failed", e);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user, permission]);
}