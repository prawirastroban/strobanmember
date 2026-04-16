import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clear all caches on app load to ensure latest version
const APP_VERSION = Date.now().toString();

(async () => {
  try {
    // Clear all localStorage cache keys (preserve auth)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("cache_") || key.startsWith("tires_") || key.includes("_cached"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Clear sessionStorage caches
    sessionStorage.clear();

    // Unregister stale service workers and clear caches
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // Clear Cache Storage (PWA / workbox caches)
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  } catch (e) {
    console.warn("Cache clear failed:", e);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
