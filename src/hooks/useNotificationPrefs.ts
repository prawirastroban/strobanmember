import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePwaSettings } from "@/hooks/usePwaSettings";

export interface UserNotifPrefs {
  enabled: boolean;
  ringtone: string | null;
  vibrate: boolean | null;
}

export interface MergedNotifConfig {
  enabled: boolean;
  ringtone: string;
  vibrate: boolean;
  iconUrl: string | null;
  soundUrl: string | null;
}

const DEFAULT_PREFS: UserNotifPrefs = { enabled: true, ringtone: null, vibrate: null };

/**
 * Merges global pwa_settings + per-user user_notification_prefs and
 * pushes the result to the FCM service worker via postMessage so background
 * notifications honor the latest icon/vibrate/tag settings.
 */
export function useNotificationPrefs() {
  const { user } = useAuth();
  const { settings } = usePwaSettings();
  const [prefs, setPrefs] = useState<UserNotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("user_notification_prefs")
        .select("enabled,ringtone,vibrate")
        .eq("user_id", user.id)
        .maybeSingle();
      if (mounted) {
        setPrefs(data ? { ...DEFAULT_PREFS, ...data } : DEFAULT_PREFS);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`notif-prefs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notification_prefs", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (mounted && payload.new) setPrefs({ ...DEFAULT_PREFS, ...(payload.new as any) });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const merged: MergedNotifConfig = useMemo(() => ({
    enabled: settings.notification_enabled !== false && prefs.enabled,
    ringtone: prefs.ringtone ?? settings.default_ringtone ?? "default",
    vibrate: prefs.vibrate ?? settings.default_vibrate ?? true,
    iconUrl: settings.notification_icon_url ?? null,
    soundUrl: settings.notification_sound_url ?? null,
  }), [
    settings.notification_enabled,
    settings.default_ringtone,
    settings.default_vibrate,
    settings.notification_icon_url,
    settings.notification_sound_url,
    prefs.enabled,
    prefs.ringtone,
    prefs.vibrate,
  ]);

  // Push merged config to the messaging service worker so background
  // notifications use the right icon/vibrate pattern.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js").then((reg) => {
      reg?.active?.postMessage({ type: "NOTIF_CONFIG", config: merged });
    }).catch(() => {});
  }, [merged.enabled, merged.ringtone, merged.vibrate, merged.iconUrl, merged.soundUrl]);

  const savePrefs = async (next: Partial<UserNotifPrefs>) => {
    if (!user) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    await (supabase as any)
      .from("user_notification_prefs")
      .upsert({ user_id: user.id, ...merged, updated_at: new Date().toISOString() });
  };

  return { prefs, merged, loading, savePrefs };
}