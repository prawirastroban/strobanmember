import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { popIntendedRoute } from "@/lib/lastRoute";

/**
 * Native deep-link bridge for Google OAuth on Android.
 *
 * Flow:
 *   1. signInWithGoogle() opens an in-app browser to Supabase OAuth.
 *   2. After Google returns, Supabase redirects to
 *      https://www.bengkelstroban.com/auth/native-callback?code=...
 *   3. That HTTPS URL is registered as an Android App Link for the app, so
 *      Android re-opens the app and emits `appUrlOpen` with the full URL
 *      (either https://... when App Links auto-verify, or
 *      com.bengkelstroban.app://auth/native-callback?... via the intent://
 *      fallback that AuthCallback triggers in the browser).
 *   4. We exchange the `code` for a Supabase session, close the in-app
 *      browser, and navigate to the user's intended route.
 */
const NativeAuthBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    let handle: { remove: () => void } | undefined;

    const handleUrl = async (rawUrl: string) => {
      try {
        const url = new URL(rawUrl);
        const isAuthCallback =
          url.pathname.includes("/auth/native-callback") ||
          url.pathname.includes("/auth/callback") ||
          url.host.includes("auth");
        if (!isAuthCallback) return;

        // Close any open in-app browser/CCT immediately.
        try { await Browser.close(); } catch { /* ignore */ }

        const params = new URLSearchParams(url.search);
        const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
        const hashParams = new URLSearchParams(hash);
        hashParams.forEach((v, k) => { if (!params.has(k)) params.set(k, v); });

        const code = params.get("code");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        if (cancelled) return;
        popIntendedRoute(); // clear stored intent; always land on Home
        navigate("/", { replace: true });
      } catch (err) {
        console.warn("NativeAuthBridge failed to handle deep link", err);
      }
    };

    CapacitorApp.addListener("appUrlOpen", (event) => {
      if (event?.url) void handleUrl(event.url);
    }).then((h) => { handle = h; });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [navigate]);

  return null;
};

export default NativeAuthBridge;