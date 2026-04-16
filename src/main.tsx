import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clear stale caches on app load (preserve functional caches like tire catalog)
(async () => {
  try {
    // Unregister stale service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // Clear Cache Storage (PWA / workbox caches) to force fresh assets
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  } catch (e) {
    console.warn("Cache clear failed:", e);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
