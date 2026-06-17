import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PopupAudience = "all" | "guest" | "authenticated";
export type PopupFrequency = "every_visit" | "once_per_session" | "daily" | "weekly" | "once_ever";

export interface PromoPopup {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  cta_secondary_label: string | null;
  cta_secondary_url: string | null;
  audience: PopupAudience;
  frequency: PopupFrequency;
  starts_at: string | null;
  ends_at: string | null;
  show_countdown: boolean;
  priority: number;
  is_active: boolean;
  display_pages: string[];
  created_at: string;
  updated_at: string;
}

const SEEN_PREFIX = "promo_popup_seen_";

function getSeenKey(id: string) {
  return `${SEEN_PREFIX}${id}`;
}

export function shouldShowByFrequency(popup: PromoPopup): boolean {
  const key = getSeenKey(popup.id);
  try {
    if (popup.frequency === "every_visit") return true;
    if (popup.frequency === "once_per_session") {
      return !sessionStorage.getItem(key);
    }
    const last = localStorage.getItem(key);
    if (!last) return true;
    const lastTs = parseInt(last, 10);
    if (Number.isNaN(lastTs)) return true;
    const elapsedMs = Date.now() - lastTs;
    if (popup.frequency === "once_ever") return false;
    if (popup.frequency === "daily") return elapsedMs >= 24 * 60 * 60 * 1000;
    if (popup.frequency === "weekly") return elapsedMs >= 7 * 24 * 60 * 60 * 1000;
    return true;
  } catch {
    return true;
  }
}

export function markSeen(popup: PromoPopup) {
  const key = getSeenKey(popup.id);
  try {
    if (popup.frequency === "once_per_session") {
      sessionStorage.setItem(key, String(Date.now()));
    } else if (popup.frequency !== "every_visit") {
      localStorage.setItem(key, String(Date.now()));
    }
  } catch { /* ignore */ }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("popup_session_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("popup_session_id", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function logPopupEvent(
  popupId: string,
  eventType: "impression" | "cta_click" | "cta_secondary_click" | "dismiss",
  userId: string | null,
) {
  try {
    await supabase.from("promo_popup_events").insert({
      popup_id: popupId,
      user_id: userId,
      session_id: getSessionId(),
      event_type: eventType,
    });
  } catch { /* swallow */ }
}

export function usePromoPopups(currentPath: string) {
  const { user } = useAuth();
  const [popup, setPopup] = useState<PromoPopup | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPopups = async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("promo_popups")
        .select("*")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (cancelled || error || !data) return;
      const list = data as PromoPopup[];
      const audienceOK = (p: PromoPopup) =>
        p.audience === "all" ||
        (p.audience === "guest" && !user) ||
        (p.audience === "authenticated" && !!user);

      const pageOK = (p: PromoPopup) =>
        !p.display_pages || p.display_pages.length === 0 || p.display_pages.includes(currentPath);

      const candidate = list.find(
        (p) => audienceOK(p) && pageOK(p) && shouldShowByFrequency(p),
      );
      if (candidate) setPopup(candidate);
    };
    // small delay so it doesn't jank the LCP
    const t = window.setTimeout(fetchPopups, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [user, currentPath]);

  return { popup };
}