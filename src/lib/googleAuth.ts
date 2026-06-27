import { lovable } from "@/integrations/lovable";
import { isNative, WEB_BASE_URL } from "@/lib/platform";
import { openExternal } from "@/utils/openExternal";

export const NATIVE_AUTH_CALLBACK_URL = "com.bengkelstroban.app://auth-callback";
export const NATIVE_AUTH_STATE_KEY = "stroban_native_oauth_state";
export const NATIVE_AUTH_NEXT_KEY = "stroban_native_oauth_next";

function createOAuthState() {
  try {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
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
      redirect_uri: NATIVE_AUTH_CALLBACK_URL,
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