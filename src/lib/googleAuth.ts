import { lovable } from "@/integrations/lovable";
import { isNative, webBaseUrl } from "@/lib/platform";
import { openExternal } from "@/utils/openExternal";

/**
 * Native-safe wrapper for Google OAuth.
 *
 * Lovable's `/~oauth/initiate` route exists only on the hosted web origin
 * (lovable.app / bengkelstroban.com). Inside Capacitor WebView the origin is
 * `capacitor://localhost`, so the helper would navigate to a non-existent
 * route and the SPA renders 404.
 *
 * On native we instead pop the published web login in a Chrome Custom Tab
 * (`/auth?google=1`) — `Auth.tsx` detects the `google=1` flag and triggers
 * the real Lovable OAuth call from the web origin where `/~oauth/*` is valid.
 *
 * Returns `{ redirected: boolean, error?: Error }`.
 */
export async function signInWithGoogle(opts?: { redirectPath?: string | null }): Promise<{
  redirected: boolean;
  error?: Error;
}> {
  if (isNative()) {
    const params = new URLSearchParams({ google: "1" });
    if (opts?.redirectPath && opts.redirectPath.startsWith("/")) {
      params.set("next", opts.redirectPath);
    }
    const url = `${webBaseUrl()}/auth?${params.toString()}`;
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