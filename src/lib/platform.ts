import { Capacitor } from "@capacitor/core";

/** Canonical published web origin for redirect URLs in native context. */
export const WEB_BASE_URL = "https://www.bengkelstroban.com";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isAndroid(): boolean {
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

/**
 * Returns a safe base URL for OAuth/email-redirect targets.
 * Native shells run on `capacitor://localhost` which Supabase cannot use,
 * so we send those flows through the published web origin and let the SPA
 * resume the session there.
 */
export function webBaseUrl(): string {
  if (isNative()) return WEB_BASE_URL;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return WEB_BASE_URL;
}