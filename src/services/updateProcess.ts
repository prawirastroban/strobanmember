import { APP_VERSION, APP_BUILD_NUMBER } from "@/lib/appVersion";
import { runVersionCheck } from "@/services/versionCheck";

/**
 * Phase 4 — Smart Update Process.
 *
 * Orchestrates a real "update the running app" flow without touching
 * authentication, routing, or database state. Only Cache Storage entries
 * belonging to the app-shell Workbox caches are cleared; localStorage,
 * sessionStorage, IndexedDB, and Firebase Messaging caches are left
 * intact so the user stays signed in across the reload.
 */

export type UpdateLogEvent =
  | "update_started"
  | "revalidated"
  | "no_update_needed"
  | "service_worker_updated"
  | "cache_cleared"
  | "assets_downloaded"
  | "version_updated"
  | "update_failed";

export interface UpdateLog {
  event: UpdateLogEvent;
  at: string;
  detail?: Record<string, unknown>;
}

export interface UpdateOutcome {
  status: "success" | "no_update" | "failed";
  error?: unknown;
  durationMs: number;
}

export const UPDATE_MARKER_KEY = "app_last_updated";

// App-shell Workbox cache names — MUST stay in sync with vite.config.ts.
const APP_SHELL_CACHES = ["html-pages", "static-assets", "images", "supabase-api"];

function isAppShellCache(name: string): boolean {
  if (APP_SHELL_CACHES.includes(name)) return true;
  if (name.startsWith("workbox-precache")) return true;
  return false;
}

function isProtectedCache(name: string): boolean {
  // Firebase Cloud Messaging / other messaging workers must remain intact.
  return (
    name.startsWith("firebase-") ||
    name.startsWith("fcm-") ||
    name.startsWith("firebase-messaging")
  );
}

async function syncServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;

    // Kick a fresh update check.
    await reg.update().catch(() => {});

    // Wait up to 6s for a waiting worker to appear, then promote it.
    const waiting = await new Promise<ServiceWorker | null>((resolve) => {
      if (reg.waiting) return resolve(reg.waiting);
      const timeout = setTimeout(() => resolve(reg.waiting ?? null), 6000);
      const onUpdate = () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && reg.waiting) {
            clearTimeout(timeout);
            resolve(reg.waiting);
          }
        });
      };
      reg.addEventListener("updatefound", onUpdate);
    });

    if (waiting) {
      try {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } catch { /* noop */ }
    }
    return true;
  } catch {
    return false;
  }
}

async function cleanAppShellCaches(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  let removed = 0;
  try {
    const names = await caches.keys();
    for (const name of names) {
      if (isProtectedCache(name)) continue;
      if (!isAppShellCache(name)) continue;
      const ok = await caches.delete(name).catch(() => false);
      if (ok) removed += 1;
    }
  } catch { /* noop */ }
  return removed;
}

async function fetchFreshShell(): Promise<void> {
  try {
    await fetch(`/index.html?ts=${Date.now()}`, {
      cache: "reload",
      credentials: "same-origin",
    });
  } catch { /* noop */ }
}

export async function runSmartUpdate(opts?: {
  onLog?: (log: UpdateLog) => void;
}): Promise<UpdateOutcome> {
  const started = performance.now();
  const log = (event: UpdateLogEvent, detail?: Record<string, unknown>) => {
    const entry: UpdateLog = { event, at: new Date().toISOString(), detail };
    // eslint-disable-next-line no-console
    console.debug(`[UpdateProcess] ${event}`, detail ?? "");
    opts?.onLog?.(entry);
  };

  log("update_started", { localVersion: APP_VERSION, localBuild: APP_BUILD_NUMBER });

  try {
    // 1. Re-validate.
    const check = await runVersionCheck();
    log("revalidated", {
      isUpdateAvailable: check.isUpdateAvailable,
      serverVersion: check.serverVersion,
      serverBuild: check.serverBuild,
    });
    if (!check.isUpdateAvailable) {
      log("no_update_needed");
      return { status: "no_update", durationMs: performance.now() - started };
    }

    // 2. Sync Service Worker.
    const swSynced = await syncServiceWorker();
    log("service_worker_updated", { swSynced });

    // 3. Clean app-shell caches.
    const removed = await cleanAppShellCaches();
    log("cache_cleared", { removed });

    // 4. Force fresh HTML shell.
    await fetchFreshShell();
    log("assets_downloaded");

    // 5. Persist marker for post-reload snackbar.
    try {
      localStorage.setItem(
        UPDATE_MARKER_KEY,
        JSON.stringify({
          version: check.serverVersion ?? APP_VERSION,
          build: check.serverBuild ?? APP_BUILD_NUMBER,
          at: new Date().toISOString(),
        }),
      );
    } catch { /* noop */ }

    const durationMs = performance.now() - started;
    log("version_updated", { durationMs });

    // 6. Reload — session in localStorage is preserved.
    try {
      window.location.reload();
    } catch { /* noop */ }

    return { status: "success", durationMs };
  } catch (error) {
    const durationMs = performance.now() - started;
    log("update_failed", { error: String(error), durationMs });
    return { status: "failed", error, durationMs };
  }
}

/**
 * Phase 6 — retry wrapper around `runSmartUpdate` with backoff.
 * Successful reload short-circuits before the last retry finishes.
 */
export async function runSmartUpdateWithRetry(opts?: {
  onLog?: (log: UpdateLog) => void;
  onAttempt?: (attempt: number, outcome: UpdateOutcome) => void;
  retries?: number;
  backoffMs?: number[];
}): Promise<UpdateOutcome> {
  const retries = opts?.retries ?? 3;
  const backoff = opts?.backoffMs ?? [1500, 3000, 6000];
  let last: UpdateOutcome = { status: "failed", durationMs: 0 };
  for (let attempt = 1; attempt <= retries; attempt++) {
    last = await runSmartUpdate({ onLog: opts?.onLog });
    opts?.onAttempt?.(attempt, last);
    if (last.status === "success" || last.status === "no_update") return last;
    if (attempt < retries) {
      const delay = backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 3000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return last;
}

/**
 * Phase 6 — best-effort detection of "user has unsaved work".
 * Consumers register a flag via `window.__stroban_pending`:
 *   window.__stroban_pending = { forms: 1, uploads: 0 };
 * Also inspects the in-flight fetch counter exposed by httpVersionHeaders.
 */
export function hasPendingWork(): boolean {
  try {
    const w = window as Window & {
      __stroban_pending?: { forms?: number; uploads?: number };
      __stroban_inflight_fetches?: number;
    };
    const p = w.__stroban_pending;
    if (p && ((p.forms ?? 0) > 0 || (p.uploads ?? 0) > 0)) return true;
    if ((w.__stroban_inflight_fetches ?? 0) > 0) return true;
  } catch { /* ignore */ }
  return false;
}