import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/appVersion";
import { useAuth } from "@/contexts/AuthContext";

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  return "Other";
}

function detectOS(ua: string): string {
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

export function useClientVersionTracker() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    void supabase
      .from("app_version_clients")
      .upsert(
        {
          user_id: user.id,
          current_version: APP_VERSION,
          last_seen_at: new Date().toISOString(),
          user_agent: ua.slice(0, 500),
          browser: detectBrowser(ua),
          os: detectOS(ua),
          update_status: "updated",
        },
        { onConflict: "user_id" },
      );
  }, [user?.id]);
}