import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Best-effort: only unregister stale service workers ONCE per session.
// Do NOT clear Cache Storage on every load — it nukes functional caches
// (e.g. tire catalog) and can race with in-flight fetches, causing the
// catalog to render empty before the network responds.
(async () => {
  try {
    const FLAG = "__sw_unregistered_v1";
    if (!sessionStorage.getItem(FLAG) && "serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
      sessionStorage.setItem(FLAG, "1");
    }
  } catch (e) {
    console.warn("SW unregister failed:", e);
  }
})();

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

createRoot(document.getElementById("root")!).render(<App />);
