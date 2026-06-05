// Guarded service-worker registration for app-shell PWA.
// Refuses to register in dev, iframes, and Lovable preview hostnames.
// Auto-updates installed app: when a new SW takes control, reload once.

const SW_PATH = "/sw.js";

function isLovablePreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

function shouldRefuse(): boolean {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  if (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off") return true;
  if (isLovablePreviewHost(window.location.hostname)) return true;
  return false;
}

async function unregisterAppShellSW(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      // Only unregister our app-shell SW, NEVER firebase-messaging-sw.js
      if (url.endsWith(SW_PATH)) {
        await r.unregister();
      }
    }
  } catch {
    /* noop */
  }
}

// NOTE: We intentionally do NOT reload on `controllerchange`. The Firebase
// Messaging SW shares scope "/" with our app SW; whichever activates last
// becomes the controller and would otherwise trigger an unwanted reload loop
// ("auto refresh glitch"). New app SW versions take effect on the user's
// next natural navigation / tab open instead.

async function register() {
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });

    // Poll for updates every 60 minutes for long-lived sessions
    setInterval(() => {
      reg.update().catch(() => {});
    }, 60 * 60 * 1000);

    // Trigger an immediate check after the app loads
    setTimeout(() => reg.update().catch(() => {}), 5000);

    // Do not force the waiting SW to take over an active tab — that causes
    // mid-session reloads. The new SW will activate on next page load.
  } catch {
    /* noop */
  }
}

if (typeof window !== "undefined") {
  if (shouldRefuse()) {
    // Clean up any previously-registered app-shell SW
    if ("serviceWorker" in navigator) {
      void unregisterAppShellSW();
    }
  } else {
    window.addEventListener("load", () => {
      void register();
    });
  }
}

export {};