import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";
import "./pwa/registerSW";

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
