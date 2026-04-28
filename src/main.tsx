import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import {
  buildLatestPreviewUrl,
  cleanupPreviewCaches,
  disablePreviewManifest,
  isPreviewHost,
  isRootVisiblyEmpty,
  recoverPreview,
  shouldForceLatestPreview,
  shouldRecoverFromMessage,
} from "@/lib/previewRecovery";
import "./index.css";

const previewHost = typeof window !== "undefined" && isPreviewHost();
const forceLatestPreview = typeof window !== "undefined" && shouldForceLatestPreview();

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
if (typeof window !== "undefined") {
  disablePreviewManifest();

  if (forceLatestPreview) {
    window.location.replace(buildLatestPreviewUrl());
  }

  window.addEventListener(
    "error",
    (event) => {
      const message = event.error?.message || event.message || "";
      if (shouldRecoverFromMessage(message)) {
        void recoverPreview(`window-error:${message}`);
      }
    },
    { capture: true }
  );

  window.addEventListener("unhandledrejection", (event) => {
    const message =
      typeof event.reason === "string"
        ? event.reason
        : event.reason?.message || String(event.reason || "");

    if (shouldRecoverFromMessage(message)) {
      event.preventDefault();
      void recoverPreview(`unhandled-rejection:${message}`);
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (previewHost && event.persisted) {
      void recoverPreview("pageshow-persisted", { force: true });
    }
  });
}

if (!forceLatestPreview) {
  createRoot(document.getElementById("root")!).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

// Best-effort SW + stale cache cleanup — runs AFTER React has mounted, so a
// slow/hanging serviceWorker call can never block first paint. No auto-reload.
const cleanupStaleServiceWorkers = async () => {
  try {
    const FLAG = "__sw_cleanup_v3";
    if (sessionStorage.getItem(FLAG)) return;
    await cleanupPreviewCaches(false);

    sessionStorage.setItem(FLAG, "1");
  } catch (e) {
    console.warn("SW cleanup failed:", e);
  }
};

if (typeof window !== "undefined") {
  window.setTimeout(() => {
    if (document.visibilityState === "visible" && isRootVisiblyEmpty()) {
      void recoverPreview("empty-root-after-mount", { force: true });
    }
  }, 1200);

  if (document.readyState === "complete") {
    setTimeout(cleanupStaleServiceWorkers, 1500);
  } else {
    window.addEventListener("load", () => setTimeout(cleanupStaleServiceWorkers, 1500), { once: true });
  }
}
