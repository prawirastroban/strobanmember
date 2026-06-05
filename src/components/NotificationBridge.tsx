import { useEffect, useRef } from "react";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useWebPush } from "@/hooks/useWebPush";
import { useAppBadge } from "@/hooks/useAppBadge";

/**
 * Mounted once globally. Side-effects:
 * 1. Registers FCM web-push for the signed-in user.
 * 2. Streams merged notification config to firebase-messaging-sw.js.
 * 3. Plays the chosen ringtone in foreground when a push arrives.
 */
export default function NotificationBridge() {
  useWebPush();
  useAppBadge();
  const { merged } = useNotificationPrefs();
  const mergedRef = useRef(merged);
  mergedRef.current = merged;

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handler = () => {
      const cfg = mergedRef.current;
      if (!cfg.enabled || cfg.ringtone === "silent") return;
      try {
        const url =
          cfg.soundUrl ||
          `https://actions.google.com/sounds/v1/alarms/${
            cfg.ringtone === "chime" ? "gentle_alarm" :
            cfg.ringtone === "bell" ? "bugle_tune" :
            cfg.ringtone === "ding" ? "alarm_clock" : "beep_short"
          }.ogg`;
        const a = new Audio(url);
        a.volume = 0.5;
        a.play().catch(() => {});
        if (cfg.vibrate && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      } catch {}
    };
    window.addEventListener("fcm-foreground", handler as EventListener);
    return () => window.removeEventListener("fcm-foreground", handler as EventListener);
  }, []);

  return null;
}