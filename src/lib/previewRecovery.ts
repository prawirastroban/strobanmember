const RECOVERY_STATE_KEY = "__preview_recovery_state_v1";
const RECOVERY_BUSTER_KEY = "__preview_refresh";
const PREVIEW_URL_MAX_AGE_MS = 15_000;

type RecoveryState = {
  count: number;
  lastAttemptAt: number;
  lastReason: string;
};

const RECOVERY_LIMIT = 2;
const RECOVERY_WINDOW_MS = 45_000;

const readRecoveryState = (): RecoveryState => {
  try {
    const raw = sessionStorage.getItem(RECOVERY_STATE_KEY);
    if (!raw) {
      return { count: 0, lastAttemptAt: 0, lastReason: "" };
    }

    const parsed = JSON.parse(raw) as Partial<RecoveryState>;
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      lastAttemptAt: typeof parsed.lastAttemptAt === "number" ? parsed.lastAttemptAt : 0,
      lastReason: typeof parsed.lastReason === "string" ? parsed.lastReason : "",
    };
  } catch {
    return { count: 0, lastAttemptAt: 0, lastReason: "" };
  }
};

const writeRecoveryState = (reason: string) => {
  const now = Date.now();
  const current = readRecoveryState();
  const nextCount = now - current.lastAttemptAt > RECOVERY_WINDOW_MS ? 1 : current.count + 1;

  try {
    sessionStorage.setItem(
      RECOVERY_STATE_KEY,
      JSON.stringify({
        count: nextCount,
        lastAttemptAt: now,
        lastReason: reason,
      } satisfies RecoveryState)
    );
  } catch {
    /* noop */
  }
};

const canRecover = (force = false) => {
  if (force) return true;
  const current = readRecoveryState();
  if (Date.now() - current.lastAttemptAt > RECOVERY_WINDOW_MS) return true;
  return current.count < RECOVERY_LIMIT;
};

export const isRootVisiblyEmpty = () => {
  const root = document.getElementById("root");
  if (!root) return true;
  return root.childElementCount === 0 && root.textContent?.trim() === "";
};

export const isPreviewHost = () => {
  return typeof window !== "undefined" && window.location.hostname.includes("-preview--");
};

export const getPreviewRefreshTimestamp = () => {
  if (typeof window === "undefined") return 0;

  const value = new URL(window.location.href).searchParams.get(RECOVERY_BUSTER_KEY);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const shouldForceLatestPreview = () => {
  if (!isPreviewHost()) return false;

  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigationEntry?.type === "back_forward") return true;

  const refreshAt = getPreviewRefreshTimestamp();
  if (!refreshAt) return true;

  return Date.now() - refreshAt > PREVIEW_URL_MAX_AGE_MS;
};

export const buildLatestPreviewUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_BUSTER_KEY, String(Date.now()));
  return url.toString();
};

export const disablePreviewManifest = () => {
  if (!isPreviewHost()) return;
  document.querySelector('link[rel="manifest"]')?.remove();
};

export const shouldRecoverFromMessage = (message: string) => {
  return /(ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS|Unexpected token '<')/i.test(
    message
  );
};

export const cleanupPreviewCaches = async (aggressive = false) => {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      const keysToDelete = aggressive
        ? cacheKeys
        : cacheKeys.filter(
            (key) =>
              key.includes("workbox") ||
              key.includes("vite-pwa") ||
              key.includes("supabase-cache") ||
              key.includes("sw-precache")
          );

      await Promise.all(keysToDelete.map((key) => caches.delete(key).catch(() => false)));
    }
  } catch (error) {
    console.warn("Preview cache cleanup failed", error);
  }
};

export const recoverPreview = async (reason: string, options?: { force?: boolean }) => {
  if (!canRecover(options?.force)) return false;

  writeRecoveryState(reason);
  await cleanupPreviewCaches(true);

  window.location.replace(buildLatestPreviewUrl());
  return true;
};