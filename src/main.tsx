import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";

// Best-effort: only unregister stale service workers ONCE per session.
// Do NOT clear Cache Storage on every load — it nukes functional caches
// (e.g. tire catalog) and can race with in-flight fetches, causing the
// catalog to render empty before the network responds.
const bootstrap = async () => {
  try {
    const FLAG = "__sw_cleanup_v2";
    const RELOAD_FLAG = "__sw_cleanup_reload_v2";

    if (!sessionStorage.getItem(FLAG) && "serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length > 0) {
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => key.includes("workbox") || key.includes("supabase-cache") || key.includes("vite-pwa"))
            .map((key) => caches.delete(key))
        );
      }

      sessionStorage.setItem(FLAG, "1");

      if (navigator.serviceWorker.controller && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return;
      }
    }
  } catch (e) {
    console.warn("SW cleanup failed:", e);
  }

// Clear any corrupt Supabase session token that throws
// "Invalid Refresh Token: Refresh Token Not Found" on every page load.
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

  createRoot(document.getElementById("root")!).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
};

void bootstrap();
