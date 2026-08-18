import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PLAY_STORE_URL } from "@/lib/androidAppLink";

export interface PwaSettings {
  banner_enabled: boolean;
  banner_title: string;
  banner_subtitle: string;
  delay_seconds: number;
  reprompt_days: number;
  notification_enabled: boolean;
  notification_icon_url: string | null;
  notification_sound_url: string | null;
  default_ringtone: string;
  default_vibrate: boolean;
  android_store_enabled: boolean;
  android_store_url: string;
  android_open_in_app_enabled: boolean;
  android_banner_title: string | null;
  android_banner_subtitle: string | null;
}

const DEFAULTS: PwaSettings = {
  banner_enabled: true,
  banner_title: "Install Bengkel Mobil Stroban",
  banner_subtitle: "Akses lebih cepat & notifikasi langsung",
  delay_seconds: 5,
  reprompt_days: 0,
  notification_enabled: true,
  notification_icon_url: null,
  notification_sound_url: null,
  default_ringtone: "default",
  default_vibrate: true,
  android_store_enabled: true,
  android_store_url: DEFAULT_PLAY_STORE_URL,
  android_open_in_app_enabled: true,
  android_banner_title: null,
  android_banner_subtitle: null,
};

export function usePwaSettings() {
  const [settings, setSettings] = useState<PwaSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("pwa_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();
        if (mounted && data) setSettings({ ...DEFAULTS, ...(data as unknown as Partial<PwaSettings>) });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("pwa-settings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pwa_settings" },
        (payload) => {
          if (mounted && payload.new) setSettings({ ...DEFAULTS, ...(payload.new as unknown as Partial<PwaSettings>) });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}