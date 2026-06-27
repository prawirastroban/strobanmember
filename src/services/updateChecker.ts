import { APP_VERSION, MIN_SUPPORTED_VERSION } from "@/config/version";
import { compareVersion } from "@/lib/appVersion";

export interface UpdateInfo {
  current: string;
  latest: string;
  minSupported: string;
  /** True when current < minSupported — UI should force-block until updated. */
  mustUpdate: boolean;
  /** True when current < latest — UI may show a soft prompt. */
  hasUpdate: boolean;
  /** Optional store/download URL surfaced to the user. */
  url?: string;
}

/**
 * Scaffold for future OTA update detection. Not wired anywhere yet.
 *
 * Wire-up plan (do NOT implement until product decides cadence):
 *  1. Read `app_settings` rows `app_version` + `app_min_version` from Supabase.
 *  2. Compare against `APP_VERSION` / `MIN_SUPPORTED_VERSION`.
 *  3. Return null when offline / read fails — callers should treat null as
 *     "no update info available" and never block the user.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const latest = APP_VERSION; // TODO: fetch from app_settings.app_version
    const minSupported = MIN_SUPPORTED_VERSION; // TODO: fetch from app_settings.app_min_version
    return {
      current: APP_VERSION,
      latest,
      minSupported,
      mustUpdate: compareVersion(APP_VERSION, minSupported) < 0,
      hasUpdate: compareVersion(APP_VERSION, latest) < 0,
    };
  } catch (err) {
    console.warn("[updateChecker] failed", err);
    return null;
  }
}