import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { NATIVE_AUTH_CALLBACK_URL } from "@/lib/googleAuth";

/**
 * OAuth callback fallback. Lovable Cloud Managed OAuth normally returns the
 * user directly to `redirect_uri` (the app origin), but some providers may
 * land here. We wait for the session, ensure a profile row exists for new
 * Google users (race-safe upsert in case the DB trigger is delayed),
 * then send the user to the home page.
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

    const returnToNativeApp = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("native") !== "1") return false;

      const hashParams = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash);
      const session = await waitForSession();
      const accessToken = session?.access_token || hashParams.get("access_token") || "";
      const refreshToken = session?.refresh_token || hashParams.get("refresh_token") || "";
      if (!accessToken || !refreshToken) return false;

      if (session?.user) {
        await ensureProfile(session.user);
        try {
          const { data: pre } = await supabase.functions.invoke("signup-precheck", {
            body: { mode: "oauth" },
          });
          if ((pre as any)?.ok === false && (pre as any)?.reason === "duplicate_signup_ip") {
            await supabase.auth.signOut();
            const duplicate = new URL(NATIVE_AUTH_CALLBACK_URL);
            duplicate.searchParams.set("error", "duplicate_ip");
            window.location.replace(duplicate.toString());
            return true;
          }
        } catch {
          /* fail-open */
        }
      }

      const callback = new URL(NATIVE_AUTH_CALLBACK_URL);
      callback.hash = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        state: params.get("native_state") || "",
      }).toString();
      window.location.replace(callback.toString());
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
    <div className="min-h-[calc(var(--vh)*100)] flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Menyelesaikan login...</p>
    </div>
  );
};

export default AuthCallback;