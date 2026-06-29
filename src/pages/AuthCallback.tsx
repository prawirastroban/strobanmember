import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { popIntendedRoute } from "@/lib/lastRoute";

function readCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash,
  );
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => window.clearTimeout(timeout));
  });
}

/**
 * Web-only OAuth callback. Lovable Managed OAuth returns here after Google
 * sign-in on web/PWA. Android no longer touches this route — native uses the
 * GoogleAuth plugin and exchanges an ID token directly with Supabase.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

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

    const hydrateSessionFromUrl = async (params: URLSearchParams): Promise<Session | null> => {
      const code = params.get("code");
      if (code) {
        const { data, error } = await withTimeout(
          supabase.auth.exchangeCodeForSession(code),
          6000,
          { data: { session: null }, error: new Error("OAuth exchange timed out") } as Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>,
        );
        if (!error && data.session) return data.session;
      }

      const accessToken = params.get("access_token") || "";
      const refreshToken = params.get("refresh_token") || "";
      if (accessToken && refreshToken) {
        const { data, error } = await withTimeout(
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
          6000,
          { data: { session: null, user: null }, error: new Error("OAuth session timed out") } as Awaited<ReturnType<typeof supabase.auth.setSession>>,
        );
        if (!error && data.session) return data.session;
      }

      return null;
    };

    const waitForSession = async () => {
      const immediate = await withTimeout(
        supabase.auth.getSession(),
        4000,
        { data: { session: null }, error: new Error("Session restore timed out") } as Awaited<ReturnType<typeof supabase.auth.getSession>>,
      );
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
      // Try to hydrate session from URL params first (code/token grants),
      // then fall back to whatever Supabase already has in storage.
      const params = readCallbackParams();
      const session = (await hydrateSessionFromUrl(params)) || (await waitForSession());
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
        const next = popIntendedRoute();
        navigate(next, { replace: true });
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
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Menyelesaikan login...</p>
    </div>
  );
};

export default AuthCallback;