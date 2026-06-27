/**
 * Centralized application version metadata.
 *
 * Single source of truth for:
 *  - Android `versionName` / `versionCode` (synced by scripts/sync-android-version.mjs)
 *  - Maintenance / Update center comparisons
 *  - Future OTA update checker (`src/services/updateChecker.ts`)
 *
 * Bump on every release. Web build also injects a date-based version via
 * Vite `define: __APP_VERSION__` — see `src/lib/appVersion.ts` for the
 * runtime export that prefers this constant when present.
 */
export const APP_VERSION = "1.0.0";

/** Monotonic integer used for Android `versionCode`. */
export const APP_BUILD_NUMBER = 1;

/** Versions below this should be force-refreshed. */
export const MIN_SUPPORTED_VERSION = "1.0.0";

/** Marketing-friendly display string (e.g. shown in About screens). */
export const APP_DISPLAY_VERSION = `v${APP_VERSION}`;