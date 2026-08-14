import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";
import "./pwa/registerSW";
import { Capacitor } from "@capacitor/core";
import { installVersionHeaders } from "@/lib/httpVersionHeaders";
// Phase 5.9 — AutomationEngine bootstrap (side-effect import wires runtime
// signal handlers before any SPK Canvas/WorkQueue mounts).
import "@/runtime/spk/AutomationBootstrap";

// Phase 6 — inject X-App-Version headers and catch HTTP 426 upgrade responses.
installVersionHeaders();

// Native plugin init (StatusBar edge-to-edge) now runs after first paint from
// <NativeBootstrap /> in App.tsx so it never blocks rendering or touch input.

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
