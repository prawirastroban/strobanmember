import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Persistent session id per tab/device so multiple tabs don't overwrite
// each other's presence row.
const SESSION_KEY = "presence:session_id:v1";
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = window.sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      window.sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `s_${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Upserts the current user's active route into `user_presence` every time the
 * route changes + every 20 s. Used by the dispatch-notification edge function
 * to skip push notifications when the user is already viewing the related page.
 */
export function usePresenceHeartbeat() {
  const { user } = useAuth();
  const location = useLocation();
  const routeRef = useRef(location.pathname);
  routeRef.current = location.pathname;

  useEffect(() => {
    if (!user) return;
    const sessionId = getSessionId();

    const beat = async () => {
      try {
        await (supabase as any).from("user_presence").upsert(
          {
            user_id: user.id,
            session_id: sessionId,
            current_route: routeRef.current || "/",
            last_seen: new Date().toISOString(),
          },
          { onConflict: "user_id,session_id" },
        );
      } catch {
        /* ignore — presence is best-effort */
      }
    };

    beat();
    const interval = setInterval(beat, 20_000);

    const onVis = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVis);

    const cleanup = async () => {
      try {
        await (supabase as any)
          .from("user_presence")
          .delete()
          .eq("user_id", user.id)
          .eq("session_id", sessionId);
      } catch { /* ignore */ }
    };
    window.addEventListener("beforeunload", cleanup);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", cleanup);
      // Don't await — fire-and-forget cleanup.
      cleanup();
    };
  }, [user]);

  // Heartbeat on every route change too (immediate update).
  useEffect(() => {
    if (!user) return;
    const sessionId = getSessionId();
    (supabase as any)
      .from("user_presence")
      .upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          current_route: location.pathname || "/",
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id,session_id" },
      )
      .then(() => {}, () => {});
  }, [user, location.pathname]);
}