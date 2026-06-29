import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { saveIntendedRoute } from "@/lib/lastRoute";

// Legacy export kept so existing imports don't break — no longer needed by the
// native flow. The web flow uses Lovable broker which returns to /auth/callback.
export const NATIVE_AUTH_CALLBACK_URL = "com.bengkelstroban.app://auth/callback";

/**
 * Native Google Sign-In via @codetrix-studio/capacitor-google-auth.
 * No browser, no Chrome Custom Tab, no deep link round trip.
 * Returns Supabase session directly from a Google ID token.
 */
async function nativeGoogleSignIn(): Promise<{ redirected: boolean; error?: Error }> {
  try {
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    // initialize() is idempotent; calling twice is safe.
    try {
      await (GoogleAuth as any).initialize?.();
    } catch {
      /* plugin auto-initializes from capacitor.config on Android */
    }
    const result: any = await GoogleAuth.signIn();
    const idToken: string | undefined =
      result?.authentication?.idToken || result?.idToken;
    if (!idToken) {
      return { redirected: false, error: new Error("Google tidak mengirim ID token") };
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) {
      return { redirected: false, error: error as Error };
    }
    return { redirected: true };
  } catch (err: any) {
    const message =
      err?.error === "popup_closed_by_user" || err?.code === "12501"
        ? "Login Google dibatalkan."
        : err?.message || "Login Google gagal. Pastikan koneksi internet dan coba lagi.";
    return { redirected: false, error: new Error(message) };
  }
}

/**
 * Sign in with Google.
 * - Android (Capacitor): native account picker via GoogleAuth plugin.
 * - Web/PWA/Desktop: Lovable Cloud Managed OAuth (popup or redirect).
 */
export async function signInWithGoogle(opts?: { redirectPath?: string | null }): Promise<{
  redirected: boolean;
  error?: Error;
}> {
  // Always remember where the user wanted to go so AuthContext can resume.
  saveIntendedRoute(opts?.redirectPath ?? null);

  if (isNative()) {
    return nativeGoogleSignIn();
  }

  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if ((result as any)?.error) {
    return { redirected: false, error: (result as any).error as Error };
  }
  return { redirected: true };
}