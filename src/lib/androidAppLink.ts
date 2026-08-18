/**
 * Android deep-link helpers.
 *
 * On Android Chrome an `intent://` URL opens the installed app (verified App
 * Links via /.well-known/assetlinks.json). When the app is NOT installed the
 * browser automatically follows `S.browser_fallback_url`, which we point at
 * the Play Store listing. That single URL therefore covers both cases.
 */
export const ANDROID_PACKAGE = "com.bengkelstroban.app";

export const DEFAULT_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bengkelstroban.app&pcampaignid=web_share";

/** Canonical public origin that is verified for App Links. */
const APP_LINK_ORIGIN = "https://www.bengkelstroban.com";

export function buildAndroidIntentUrl(path: string, fallbackUrl: string): string {
  const target = new URL(path || "/", APP_LINK_ORIGIN);
  const hostAndPath = `${target.host}${target.pathname}${target.search}`;
  return (
    `intent://${hostAndPath}#Intent;scheme=https;package=${ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl || DEFAULT_PLAY_STORE_URL)};end`
  );
}

/** Try to open the installed Android app; falls back to the Play Store. */
export function openAndroidApp(path: string, playStoreUrl?: string) {
  try {
    window.location.href = buildAndroidIntentUrl(path, playStoreUrl || DEFAULT_PLAY_STORE_URL);
  } catch {
    openPlayStore(playStoreUrl);
  }
}

/** Go straight to the Play Store listing. */
export function openPlayStore(playStoreUrl?: string) {
  const url = playStoreUrl || DEFAULT_PLAY_STORE_URL;
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = url;
  }
}
