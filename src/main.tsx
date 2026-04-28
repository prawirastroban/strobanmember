import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { isEmbeddedPreview } from "@/lib/runtimeEnv";
import "./index.css";

// Clear any corrupt Supabase session token that throws
// "Invalid Refresh Token: Refresh Token Not Found" on every page load.
// This is synchronous and cheap — safe to run before React mounts.
try {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      const raw = localStorage.getItem(key);
      if (raw && raw.includes('"refresh_token":""')) {
        localStorage.removeItem(key);
      }
    }
  }
} catch {
  /* noop */
}

// Render React IMMEDIATELY so the preview never shows a blank white screen
// while async cleanup runs. Previously we awaited service-worker APIs before
// mounting, which could hang in iframe previews and leave the page blank.
createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

// Best-effort SW + stale cache cleanup — runs AFTER React has mounted, so a
// slow/hanging serviceWorker call can never block first paint. No auto-reload.
const cleanupStaleServiceWorkers = async () => {
  try {
    const FLAG = "__sw_cleanup_v3";
    if (isEmbeddedPreview()) return;
    if (sessionStorage.getItem(FLAG)) return;
    if (!("serviceWorker" in navigator)) return;

    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) {
      await Promise.all(registrations.map((r) => r.unregister().catch(() => {})));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.includes("workbox") || key.includes("supabase-cache") || key.includes("vite-pwa"))
          .map((key) => caches.delete(key).catch(() => false))
      );
    }

    sessionStorage.setItem(FLAG, "1");
  } catch (e) {
    console.warn("SW cleanup failed:", e);
  }
};

if (typeof window !== "undefined") {
  if (!isEmbeddedPreview()) {
    if (document.readyState === "complete") {
      setTimeout(cleanupStaleServiceWorkers, 1500);
    } else {
      window.addEventListener("load", () => setTimeout(cleanupStaleServiceWorkers, 1500), { once: true });
    }
  }
}
