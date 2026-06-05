import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Keeps the app icon badge (iOS PWA / Chrome PWA) in sync with the user's
 * unread notifications count using the Badging API + Supabase Realtime.
 */
export function useAppBadge() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as any;
    if (!("setAppBadge" in nav)) return;
    if (!user) {
      nav.clearAppBadge?.().catch?.(() => {});
      return;
    }

    let mounted = true;

    const refresh = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!mounted) return;
      try {
        if (count && count > 0) await nav.setAppBadge(count);
        else await nav.clearAppBadge();
      } catch { /* ignore */ }
    };

    refresh();

    const ch = supabase
      .channel(`badge-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();

    // Also refresh when tab becomes visible (catches changes made on other devices)
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);
}