import { APP_VERSION, APP_BUILD_NUMBER, compareVersion } from "@/lib/appVersion";
import { getVersionRegistry } from "@/services/versionRegistry";

/**
 * Version Check Service — Phase 2 of the Update Manager.
 *
 * Pure detection: compares the locally-built app version with the
 * server-side Version Registry (Phase 1). Never mutates state, never
 * touches the Service Worker, never navigates, never shows UI.
 */

export type VersionCheckStatus = "idle" | "checking" | "ok" | "failed";

export interface VersionCheckResult {
  localVersion: string;
  serverVersion: string | null;
  localBuild: number;
  serverBuild: number | null;
  isUpdateAvailable: boolean;
  checkedAt: string;
  status: Exclude<VersionCheckStatus, "idle" | "checking">;
}

/** Pure comparison — no side effects. */
export function computeUpdateAvailable(
  localVersion: string,
  serverVersion: string | null,
  localBuild: number,
  serverBuild: number | null,
): boolean {
  if (!serverVersion && !serverBuild) return false;
  if (serverVersion && compareVersion(localVersion, serverVersion) < 0) return true;
  if (typeof serverBuild === "number" && serverBuild > localBuild) return true;
  return false;
}

export async function runVersionCheck(): Promise<VersionCheckResult> {
  const checkedAt = new Date().toISOString();
  try {
    const registry = await getVersionRegistry();
    const serverVersion = registry.currentVersion || null;
    const serverBuild =
      typeof registry.buildNumber === "number" && registry.buildNumber > 0
        ? registry.buildNumber
        : null;

    const isUpdateAvailable = computeUpdateAvailable(
      APP_VERSION,
      serverVersion,
      APP_BUILD_NUMBER,
      serverBuild,
    );

    const result: VersionCheckResult = {
      localVersion: APP_VERSION,
      serverVersion,
      localBuild: APP_BUILD_NUMBER,
      serverBuild,
      isUpdateAvailable,
      checkedAt,
      status: "ok",
    };

    // Debug-only logging; never shown to the user.
    // eslint-disable-next-line no-console
    console.debug(
      `[VersionCheck] local=v${APP_VERSION} (#${APP_BUILD_NUMBER}) ` +
        `server=v${serverVersion ?? "?"} (#${serverBuild ?? "?"}) ` +
        `updateAvailable=${isUpdateAvailable} at=${checkedAt}`,
    );

    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug("[VersionCheck] failed", err);
    return {
      localVersion: APP_VERSION,
      serverVersion: null,
      localBuild: APP_BUILD_NUMBER,
      serverBuild: null,
      isUpdateAvailable: false,
      checkedAt,
      status: "failed",
    };
  }
}