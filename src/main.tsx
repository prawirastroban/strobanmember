import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";

// --- Stale-cache buster (runs BEFORE render, but is non-blocking) ---
// Old service workers from earlier PWA experiments keep intercepting requests
// inside the Lovable preview iframe and serving blank pages. Kick them off
// immediately on every load. We do NOT await — render still happens in the
// same tick.
if (typeof window !== "undefined") {
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          if (regs.length > 0) {
            regs.forEach((r) => r.unregister().catch(() => {}));
            // If a SW was controlling this page, force one reload so the
            // freshly fetched (uncontrolled) bundle is what the user sees.
            if (navigator.serviceWorker.controller) {
              const KEY = "__sw_reloaded_once";
              if (!sessionStorage.getItem(KEY)) {
                sessionStorage.setItem(KEY, "1");
                window.location.reload();
              }
            }
          }
        })
        .catch(() => {});
    }
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => caches.delete(k).catch(() => {})))
        .catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

// Mount React as early and as safely as possible. We deliberately avoid
// touching localStorage, serviceWorker, or caches BEFORE render — those calls
// have hung the preview iframe and caused blank screens. We do, however,
// clean up stale service workers AFTER mount (fire-and-forget) so old SW
// versions don't keep serving cached blank pages.
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
  const l = document.getElementById('il');
  if (l) { l.style.transition = 'opacity .3s'; l.style.opacity = '0'; setTimeout(() => l.remove(), 300); }
}
