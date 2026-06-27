import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  isNativeOAuthState,
  nativeAuthCallbackUrl,
  nativeAuthIntentUrl,
} from "@/lib/googleAuth";

/**
 * OAuth callback fallback. Lovable Cloud Managed OAuth normally returns the
 * user directly to `redirect_uri` (the app origin), but some providers may
 * land here. We wait for the session, ensure a profile row exists for new
 * Google users (race-safe upsert in case the DB trigger is delayed),
 * then send the user to the home page.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [intentUrl, setIntentUrl] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const ensureProfile = async (user: any) => {
      try {
        const meta = user.user_metadata || {};
        const fullName =
          meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : null);
        const avatarUrl = meta.avatar_url || meta.picture || null;

        // Upsert acts as a safety net for the handle_new_user trigger.
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: fullName,
            avatar_url: avatarUrl,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
      } catch {
        // Non-fatal — trigger will have created the row in most cases.
      }
    };

    const buildReturnUrl = (accessToken: string, refreshToken: string, nativeState: string, error?: string) =>
      nativeAuthCallbackUrl({
        error,
        access_token: accessToken,
        refresh_token: refreshToken,
        state: nativeState,
      });

    const triggerReturn = (url: string) => {
      const androidIntentUrl = nativeAuthIntentUrl(url);
      setReturnUrl(url);
      setIntentUrl(androidIntentUrl);
      // Chrome Custom Tabs reliably honors custom schemes only with a user
      // gesture. We attempt the redirect once (works on most Android builds
      // where the original click is still treated as a user gesture), but the
      // visible "Buka aplikasi" button is the guaranteed path home.
      const attempts = [androidIntentUrl, url];
      attempts.forEach((target, index) => {
        window.setTimeout(() => {
          try {
            window.location.replace(target);
          } catch {
            try {
              window.location.href = target;
            } catch {
              /* ignore */
            }
          }
        }, index * 650);
      });
    };

    const returnToNativeApp = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash,
      );
      // Native flow is detected via:
      //  1. explicit `?native=1` query (primary)
      //  2. `state` param prefixed with `nat_` in either query or hash (robust
      //     fallback for brokers that strip our custom query params)
      const stateFromQuery = params.get("state") || params.get("native_state") || "";
      const stateFromHash = hashParams.get("state") || "";
      const storedNativeState = (() => {
        try {
          return localStorage.getItem("stroban_native_oauth_state") || "";
        } catch {
          return "";
        }
      })();
      const isNative =
        params.get("native") === "1" ||
        isNativeOAuthState(stateFromQuery) ||
        isNativeOAuthState(stateFromHash) ||
        isNativeOAuthState(storedNativeState);
      if (!isNative) return false;

      const session = await waitForSession();
      const accessToken = session?.access_token || hashParams.get("access_token") || "";
      const refreshToken = session?.refresh_token || hashParams.get("refresh_token") || "";
      const nativeState = stateFromQuery || stateFromHash || storedNativeState;
      if (!accessToken || !refreshToken) {
        setReturnError("Token login tidak diterima. Silakan coba lagi.");
        triggerReturn(buildReturnUrl("", "", nativeState, "callback_failed"));
        return true;
      }

      if (session?.user) {
        await ensureProfile(session.user);
        try {
          const { data: pre } = await supabase.functions.invoke("signup-precheck", {
            body: { mode: "oauth" },
          });
          if ((pre as any)?.ok === false && (pre as any)?.reason === "duplicate_signup_ip") {
            await supabase.auth.signOut();
            triggerReturn(buildReturnUrl("", "", nativeState, "duplicate_ip"));
            return true;
          }
        } catch {
          /* fail-open */
        }
      }

      triggerReturn(buildReturnUrl(accessToken, refreshToken, nativeState));
      return true;
    };

    const waitForSession = async () => {
      const immediate = await supabase.auth.getSession();
      if (immediate.data.session) return immediate.data.session;

      return new Promise<Session | null>((resolve) => {
        let listener: { unsubscribe: () => void } | undefined;
        const timeout = window.setTimeout(() => {
          listener?.unsubscribe();
          resolve(null);
        }, 5000);
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            window.clearTimeout(timeout);
            listener?.unsubscribe();
            resolve(session);
          }
        });
        listener = sub.subscription;
      });
    };

    const finalize = async () => {
      if (await returnToNativeApp()) return;

      const session = await waitForSession();
      if (cancelled) return;

      if (session?.user) {
        await ensureProfile(session.user);
        // Anti-duplicate signup: stamp signup_ip and verify uniqueness.
        // If duplicate, sign out and bounce back to /auth with error.
        try {
          const { data: pre } = await supabase.functions.invoke("signup-precheck", {
            body: { mode: "oauth" },
          });
          if ((pre as any)?.ok === false && (pre as any)?.reason === "duplicate_signup_ip") {
            await supabase.auth.signOut();
            navigate("/auth?error=duplicate_ip", { replace: true });
            return;
          }
        } catch { /* fail-open */ }
        // Attach pending referral code (if any) — silent on failure.
        try {
          const refCode = localStorage.getItem("pending_ref_code");
          if (refCode) {
            await supabase.functions.invoke("attach-referrer", { body: { code: refCode } });
            localStorage.removeItem("pending_ref_code");
          }
        } catch { /* ignore */ }
        const intended = sessionStorage.getItem("postLoginRedirect");
        if (intended) {
          sessionStorage.removeItem("postLoginRedirect");
        }
        const next = intended || sessionStorage.getItem("lastVisitedPath") || "/";
        navigate(next.startsWith("/") && !next.startsWith("//") ? next : "/", { replace: true });
      } else {
        navigate("/auth?error=callback_failed", { replace: true });
      }
    };

    finalize();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-[calc(var(--vh)*100)] flex flex-col items-center justify-center gap-4 bg-background text-foreground px-6 text-center">
      {!returnUrl ? (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Menyelesaikan login...</p>
        </>
      ) : (
        <>
          <p className="text-base font-medium">Login berhasil</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {returnError
              ? returnError
              : "Aplikasi seharusnya terbuka otomatis. Jika tidak, ketuk tombol di bawah untuk kembali ke aplikasi Stroban."}
          </p>
          <a
            href={intentUrl || returnUrl}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg active:scale-[0.98] transition"
          >
            Kembali ke Aplikasi Stroban
          </a>
        </>
      )}
    </div>
  );
};

export default AuthCallback;