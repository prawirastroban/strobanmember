import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOG_KEY = "pwa_install_logged_v1";

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    // @ts-ignore iOS Safari
    if (window.navigator.standalone === true) return true;
    // @ts-ignore Capacitor
    if (window.Capacitor?.isNativePlatform?.()) return true;
  } catch {}
  return false;
}

async function logInstallOnce() {
  try {
    if (localStorage.getItem(LOG_KEY)) return;
    const platform = detectPlatform();
    await supabase.from("pwa_events").insert({ event: "accepted", platform });
    localStorage.setItem(LOG_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Logs a single "accepted" event the first time the app is opened in
 * standalone (installed) mode on this device. iOS Safari never fires
 * `appinstalled`, so detecting standalone on launch is the only reliable
 * signal that an iPhone user added the app to their Home Screen.
 */
export function useInstallTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) {
      void logInstallOnce();
    }
    const onInstalled = () => { void logInstallOnce(); };
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) void logInstallOnce();
    };
    window.addEventListener("appinstalled", onInstalled);
    mq?.addEventListener?.("change", onModeChange);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onModeChange);
    };
  }, []);
}