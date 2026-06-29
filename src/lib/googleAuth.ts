import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { saveIntendedRoute } from "@/lib/lastRoute";

// Browsers cannot reliably redirect from Google/Supabase to a custom scheme,
// so the native flow returns to an HTTPS bridge page on the published origin.
// That page either auto-opens the app via verified App Links or falls back to
// an `intent://` redirect handled by NativeAuthBridge.
export const NATIVE_AUTH_CALLBACK_URL =
  "https://www.bengkelstroban.com/auth/native-callback";

/**
 * Sign in with Google.
 * - Android (Capacitor): Supabase OAuth with native deep link callback.
 * - Web/PWA/Desktop: Lovable Cloud Managed OAuth (popup or redirect).
 */
export async function signInWithGoogle(opts?: { redirectPath?: string | null }): Promise<{
  redirected: boolean;
  error?: Error;
}> {
  // Always remember where the user wanted to go so AuthContext can resume.
  saveIntendedRoute(opts?.redirectPath ?? null);

  if (isNative()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_AUTH_CALLBACK_URL,
        queryParams: { native: "1" },
      },
    });
    if (error) {
      return { redirected: false, error: error as Error };
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
