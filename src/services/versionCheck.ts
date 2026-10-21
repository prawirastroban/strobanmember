import { APP_VERSION, APP_BUILD_NUMBER, compareVersion } from "@/lib/appVersion";
import { isNative } from "@/lib/platform";
import {
  getVersionRegistry,
  type ReleaseChannel,
  type DeploymentType,
} from "@/services/versionRegistry";

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
  releaseNotes: string | null;
  releaseDate: string | null;
  releaseChannel: ReleaseChannel | null;
  deploymentType: DeploymentType;
  minSupportedVersion: string | null;
  isBelowMinimum: boolean;
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
  let localVersion = APP_VERSION;
  let localBuild = APP_BUILD_NUMBER;
  try {
    if (isNative()) {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      localVersion = info.version;
      localBuild = Number(info.build);
      if (!localVersion || !Number.isFinite(localBuild)) throw new Error("Versi aplikasi tidak dapat dibaca");
    }
    const registry = await getVersionRegistry();
    const serverVersion = registry.currentVersion || null;
    const serverBuild =
      typeof registry.buildNumber === "number" && registry.buildNumber > 0
        ? registry.buildNumber
        : null;

    const isUpdateAvailable = computeUpdateAvailable(
      localVersion,
      serverVersion,
      localBuild,
      serverBuild,
    );
    const isBelowMinimum =
      !!registry.minSupportedVersion &&
      compareVersion(localVersion, registry.minSupportedVersion) < 0;

    const result: VersionCheckResult = {
      localVersion,
      serverVersion,
      localBuild,
      serverBuild,
      isUpdateAvailable,
      checkedAt,
      status: "ok",
      releaseNotes: registry.releaseNotes ?? null,
      releaseDate: registry.releaseDate ?? null,
      releaseChannel: registry.releaseChannel ?? null,
      deploymentType: registry.deploymentType ?? "optional",
      minSupportedVersion: registry.minSupportedVersion ?? null,
      isBelowMinimum,
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
      localVersion,
      serverVersion: null,
      localBuild,
      serverBuild: null,
      isUpdateAvailable: false,
      checkedAt,
      status: "failed",
      releaseNotes: null,
      releaseDate: null,
      releaseChannel: null,
      deploymentType: "optional",
      minSupportedVersion: null,
      isBelowMinimum: false,
    };
  }
}