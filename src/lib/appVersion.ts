// Application version helpers.
// `__APP_VERSION__` is injected at build time by Vite (see vite.config.ts).
declare const __APP_VERSION__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0-dev";

if (typeof window !== "undefined") {
  (window as Window & { __APP_VERSION__?: string }).__APP_VERSION__ = APP_VERSION;
}

/**
 * Compare two version strings.
 * Returns -1 if a<b, 0 if equal, 1 if a>b.
 * Supports dotted numeric segments (e.g. "1.2.3", "2026.0612.0930").
 */
export function compareVersion(a: string, b: string): number {
  if (!a || !b) return 0;
  const pa = a.split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

/**
 * Hard-reload the app: clear app-shell caches (preserve Firebase Messaging
 * caches), unregister `/sw.js` only, and reload with a cache-busting query.
 */
export async function hardReload(latestVersion?: string): Promise<void> {
  try {
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.allSettled(
        names
          .filter((n) => !/firebase|fcm/i.test(n))
          .map((n) => caches.delete(n)),
      );
    }
  } catch {
    /* ignore */
  }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const url =
          r.active?.scriptURL ||
          r.installing?.scriptURL ||
          r.waiting?.scriptURL ||
          "";
        if (url.endsWith("/sw.js")) {
          await r.unregister();
        }
      }
    }
  } catch {
    /* ignore */
  }
  const v = latestVersion || Date.now().toString();
  const url = new URL(window.location.href);
  url.searchParams.set("v", v);
  window.location.replace(url.toString());
}