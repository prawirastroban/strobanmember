import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import type { PluginListenerHandle } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isNative } from "@/lib/platform";
import {
  LEGACY_NATIVE_AUTH_CALLBACK_URL,
  NATIVE_AUTH_APP_LINK_URL,
  NATIVE_AUTH_CALLBACK_URL,
  NATIVE_AUTH_NEXT_KEY,
  NATIVE_AUTH_STATE_KEY,
} from "@/lib/googleAuth";

const NATIVE_AUTH_PENDING_EVENT = "stroban-native-auth-pending";
const NATIVE_AUTH_COMPLETED_EVENT = "stroban-native-auth-completed";

function readOAuthParams(rawUrl: string) {
  const url = new URL(rawUrl);
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => params.set(key, value));
  }
  return { url, params };
}

function normalizeNativeCallbackUrl(rawUrl: string) {
  if (!rawUrl.startsWith("intent://")) return rawUrl;
  const [beforeIntent] = rawUrl.split("#Intent;");
  return beforeIntent.replace(/^intent:\/\//, "com.bengkelstroban.app://");
}

function isNativeCallback(rawUrl: string) {
  try {
    const expected = new URL(NATIVE_AUTH_CALLBACK_URL);
    const legacy = new URL(LEGACY_NATIVE_AUTH_CALLBACK_URL);
    const appLink = new URL(NATIVE_AUTH_APP_LINK_URL);
    const current = new URL(normalizeNativeCallbackUrl(rawUrl));
    const isPrimaryScheme =
      current.protocol === expected.protocol &&
      current.host === expected.host &&
      current.pathname === expected.pathname;
    const isLegacyScheme = current.protocol === legacy.protocol && current.host === legacy.host;
    const isAppLink =
      current.protocol === appLink.protocol &&
      (current.hostname === appLink.hostname || current.hostname === "bengkelstroban.com") &&
      current.pathname === appLink.pathname;
    return isPrimaryScheme || isLegacyScheme || isAppLink;
  } catch {
    return false;
  }
}

/**
 * Completes Google OAuth when Android returns from Chrome Custom Tabs through
 * the app scheme (`com.bengkelstroban.app://auth-callback`).
 */
const NativeAuthBridge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    let handle: PluginListenerHandle | undefined;

    const finish = async (rawUrl: string) => {
      if (!rawUrl || !isNativeCallback(rawUrl)) return false;

      await Browser.close().catch(() => undefined);

      const { params } = readOAuthParams(normalizeNativeCallbackUrl(rawUrl));
      const error = params.get("error") || params.get("error_description");
      if (error) {
        toast({ variant: "destructive", title: "Login Google gagal", description: error });
        navigate("/auth?error=google_native", { replace: true });
        return true;
      }

      const state = params.get("state") || "";
      const accessToken = params.get("access_token") || "";
      const refreshToken = params.get("refresh_token") || "";

      try {
        const expectedState = localStorage.getItem(NATIVE_AUTH_STATE_KEY) || "";
        if (expectedState && state && expectedState !== state) {
          toast({
            variant: "destructive",
            title: "Login Google gagal",
            description: "Sesi login tidak valid. Silakan coba lagi.",
          });
          navigate("/auth?error=state_mismatch", { replace: true });
          return true;
        }
      } catch {
        /* ignore storage errors */
      }

      if (!accessToken || !refreshToken) {
        toast({
          variant: "destructive",
          title: "Login Google gagal",
          description: "Token login tidak diterima dari Google.",
        });
        navigate("/auth?error=callback_failed", { replace: true });
        return true;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) return true;

      if (sessionError) {
        toast({
          variant: "destructive",
          title: "Login Google gagal",
          description: sessionError.message,
        });
        navigate("/auth?error=callback_failed", { replace: true });
        return true;
      }

      let next = "/";
      try {
        next = localStorage.getItem(NATIVE_AUTH_NEXT_KEY) || sessionStorage.getItem("lastVisitedPath") || "/";
        localStorage.removeItem(NATIVE_AUTH_STATE_KEY);
        localStorage.removeItem(NATIVE_AUTH_NEXT_KEY);
      } catch {
        /* ignore storage errors */
      }

      const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth") ? next : "/";
      window.dispatchEvent(new CustomEvent(NATIVE_AUTH_COMPLETED_EVENT, { detail: { next: safeNext } }));
      toast({ title: "Berhasil masuk", description: "Akun Google terhubung." });
      navigate(safeNext, { replace: true });
      return true;
    };

    CapApp.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) void finish(launch.url);
      })
      .catch(() => undefined);

    CapApp.addListener("appUrlOpen", (event) => {
      void finish(event.url);
    }).then((h) => {
      handle = h;
    });

    const closeBrowserWhenAppResumes = () => {
      let expectedState = "";
      try {
        expectedState = localStorage.getItem(NATIVE_AUTH_STATE_KEY) || "";
      } catch {
        expectedState = "";
      }

      if (expectedState) {
        void Browser.close().catch(() => undefined);
      }
    };

    CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) closeBrowserWhenAppResumes();
    }).then((h) => {
      handle = h;
    });

    const pendingHandler = () => {
      void Browser.close().catch(() => undefined);
    };
    window.addEventListener(NATIVE_AUTH_PENDING_EVENT, pendingHandler);

    return () => {
      cancelled = true;
      handle?.remove?.();
      window.removeEventListener(NATIVE_AUTH_PENDING_EVENT, pendingHandler);
    };
  }, [navigate, toast]);

  return null;
};

export default NativeAuthBridge;