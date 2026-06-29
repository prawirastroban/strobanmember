import { lovable } from "@/integrations/lovable";
import { isNative, WEB_BASE_URL } from "@/lib/platform";
import { openExternal } from "@/utils/openExternal";

export const NATIVE_AUTH_CALLBACK_URL = "com.bengkelstroban.app://auth/callback";
export const LEGACY_NATIVE_AUTH_CALLBACK_URL = "com.bengkelstroban.app://auth-callback";
export const NATIVE_AUTH_APP_LINK_URL = `${WEB_BASE_URL}/auth/native-callback`;
export const NATIVE_ANDROID_PACKAGE = "com.bengkelstroban.app";
export const NATIVE_AUTH_STATE_KEY = "stroban_native_oauth_state";
export const NATIVE_AUTH_NEXT_KEY = "stroban_native_oauth_next";
/**
 * Prefix embedded into the OAuth `state` parameter so the web callback can
 * recognize a native flow even if Lovable's broker strips our custom query
 * parameters when redirecting back to `redirect_uri`.
 */
export const NATIVE_STATE_PREFIX = "nat_";

export function isNativeOAuthState(state: string | null | undefined): boolean {
  return !!state && state.startsWith(NATIVE_STATE_PREFIX);
}

export function nativeOAuthRedirectUrl(state: string) {
  // Point the OAuth broker straight at the verified Android App Link path.
  // When the device has verified `assetlinks.json`, Android intercepts this
  // URL BEFORE Chrome even loads the page and opens the app directly.
  // On devices where verification is not (yet) complete, /auth/native-callback
  // still renders the same callback handler we use for /auth/callback.
  const url = new URL("/auth/native-callback", WEB_BASE_URL);
  url.searchParams.set("native", "1");
  url.searchParams.set("native_state", state);
  return url.toString();
}

export function nativeAuthCallbackUrl(
  params?: Record<string, string | null | undefined>,
  opts?: { baseUrl?: string; useHash?: boolean },
) {
  const callback = new URL(opts?.baseUrl || NATIVE_AUTH_CALLBACK_URL);
  const encodedParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) encodedParams.set(key, value);
  });
  const serialized = encodedParams.toString();
  if (opts?.useHash !== false) {
    callback.hash = serialized;
  } else {
    callback.search = serialized;
  }
  return callback.toString();
}

export function nativeAuthAppLinkUrl(params?: Record<string, string | null | undefined>) {
  return nativeAuthCallbackUrl(params, { baseUrl: NATIVE_AUTH_APP_LINK_URL });
}

export function nativeAuthIntentUrl(callbackUrl: string) {
  const callback = new URL(callbackUrl);
  const mergedParams = new URLSearchParams(callback.search);
  const hash = callback.hash.startsWith("#") ? callback.hash.slice(1) : callback.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => mergedParams.set(key, value));
  }
  const query = mergedParams.toString();
  const pathAndSearch = `${callback.host}${callback.pathname}${query ? `?${query}` : ""}`;
  const browserFallback = `${WEB_BASE_URL}/auth/callback?native=1&return_failed=1`;
  return `intent://${pathAndSearch}#Intent;scheme=${callback.protocol.replace(":", "")};package=${NATIVE_ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(browserFallback)};end`;
}

function createOAuthState() {
  try {
    const random = [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${NATIVE_STATE_PREFIX}${random}`;
  } catch {
    return `${NATIVE_STATE_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Native-safe wrapper for Google OAuth.
 *
 * Lovable's `/~oauth/initiate` route exists only on the hosted web origin
 * (lovable.app / bengkelstroban.com). Inside Capacitor WebView the origin is
 * `capacitor://localhost`, so the helper would navigate to a non-existent
 * route and the SPA renders 404.
 *
 * On native we instead start the OAuth broker on the published web origin,
 * then return through the app scheme handled by `NativeAuthBridge`.
 *
 * Returns `{ redirected: boolean, error?: Error }`.
 */
export async function signInWithGoogle(opts?: { redirectPath?: string | null }): Promise<{
  redirected: boolean;
  error?: Error;
}> {
  if (isNative()) {
    const state = createOAuthState();
    try {
      localStorage.setItem(NATIVE_AUTH_STATE_KEY, state);
      if (opts?.redirectPath && opts.redirectPath.startsWith("/")) {
        localStorage.setItem(NATIVE_AUTH_NEXT_KEY, opts.redirectPath);
      } else {
        localStorage.removeItem(NATIVE_AUTH_NEXT_KEY);
      }
    } catch {
      /* ignore storage errors */
    }

    const params = new URLSearchParams({
      provider: "google",
      redirect_uri: nativeOAuthRedirectUrl(state),
      state,
    });
    if (opts?.redirectPath && opts.redirectPath.startsWith("/")) {
      params.set("next", opts.redirectPath);
    }
    const url = `${WEB_BASE_URL}/~oauth/initiate?${params.toString()}`;
    const ok = await openExternal(url);
    if (!ok) {
      return { redirected: false, error: new Error("Tidak bisa membuka browser eksternal") };
    }
    return { redirected: true };
  }

  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if ((result as any)?.error) {
    return { redirected: false, error: (result as any).error as Error };
  }
  return { redirected: true };
}