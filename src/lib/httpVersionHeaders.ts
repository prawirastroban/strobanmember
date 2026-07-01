import { APP_VERSION, APP_BUILD_NUMBER } from "@/lib/appVersion";

/**
 * Phase 6 — Global fetch interceptor.
 *
 * - Injects `X-App-Version`, `X-App-Build`, `X-Client-Platform` on same-origin
 *   requests and Supabase Edge Function calls.
 * - Counts in-flight fetches (used by hasPendingWork()).
 * - Emits `stroban:force-upgrade-required` when the server responds 426.
 */

const HEADER_VERSION = "X-App-Version";
const HEADER_BUILD = "X-App-Build";
const HEADER_PLATFORM = "X-Client-Platform";

function detectPlatform(): string {
  try {
    const w = window as Window & { Capacitor?: { getPlatform?: () => string } };
    const p = w.Capacitor?.getPlatform?.();
    if (p && p !== "web") return p;
  } catch { /* ignore */ }
  return "web";
}

function shouldInject(url: string): boolean {
  try {
    const u = new URL(url, window.location.href);
    if (u.origin === window.location.origin) return true;
    if (u.hostname.endsWith(".supabase.co")) return true;
    if (u.hostname.endsWith(".functions.supabase.co")) return true;
    return false;
  } catch {
    return false;
  }
}

let installed = false;

export function installVersionHeaders(): void {
  if (installed) return;
  if (typeof window === "undefined" || typeof fetch === "undefined") return;
  installed = true;

  const w = window as Window & { __stroban_inflight_fetches?: number };
  w.__stroban_inflight_fetches = 0;
  const platform = detectPlatform();
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    let nextInit = init;
    if (shouldInject(url)) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has(HEADER_VERSION)) headers.set(HEADER_VERSION, APP_VERSION);
      if (!headers.has(HEADER_BUILD)) headers.set(HEADER_BUILD, String(APP_BUILD_NUMBER));
      if (!headers.has(HEADER_PLATFORM)) headers.set(HEADER_PLATFORM, platform);
      nextInit = { ...(init ?? {}), headers };
    }

    w.__stroban_inflight_fetches = (w.__stroban_inflight_fetches ?? 0) + 1;
    try {
      const res = await original(input as RequestInfo, nextInit);
      if (res.status === 426) {
        try {
          window.dispatchEvent(
            new CustomEvent("stroban:force-upgrade-required", {
              detail: { url, status: 426 },
            }),
          );
        } catch { /* ignore */ }
      }
      return res;
    } finally {
      w.__stroban_inflight_fetches = Math.max(0, (w.__stroban_inflight_fetches ?? 1) - 1);
    }
  };
}