import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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

    const finalize = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session?.user) {
        await ensureProfile(data.session.user);
        // Attach pending referral code (if any) — silent on failure.
        try {
          const refCode = localStorage.getItem("pending_ref_code");
          if (refCode) {
            await supabase.rpc("attach_referrer" as any, { _code: refCode });
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

    // Listen first in case the session arrives slightly later than getSession().
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finalize();
    });

    finalize();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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