import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";

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

// Post-mount cleanup. Wrapped in try/catch so it can never crash the app.
if (typeof window !== "undefined") {
  window.setTimeout(() => {
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister().catch(() => {})))
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
  }, 1500);
}
