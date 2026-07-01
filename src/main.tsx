import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";
import "./pwa/registerSW";
import { Capacitor } from "@capacitor/core";
import { installVersionHeaders } from "@/lib/httpVersionHeaders";

// Phase 6 — inject X-App-Version headers and catch HTTP 426 upgrade responses.
installVersionHeaders();

// Native edge-to-edge layout: let WebView extend behind status bar so that
// env(safe-area-inset-top) reports the correct value on Android.
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) => {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor?.({ color: "#00000000" }).catch(() => {});
    })
    .catch(() => {});
}

const rootEl = document.getElementById("root");
if (rootEl) {
  if (typeof window !== "undefined") {
    (window as Window & { __appMounted?: boolean }).__appMounted = true;
  }

  createRoot(rootEl).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );

  const loader = document.getElementById("il");
  if (loader) {
    requestAnimationFrame(() => {
      loader.style.transition = "opacity .3s";
      loader.style.opacity = "0";
      window.setTimeout(() => loader.remove(), 300);
    });
  }
}
