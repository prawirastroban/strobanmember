import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PwaSettings {
  banner_enabled: boolean;
  banner_title: string;
  banner_subtitle: string;
  delay_seconds: number;
  reprompt_days: number;
}

const DEFAULTS: PwaSettings = {
  banner_enabled: true,
  banner_title: "Install Sahabat Stroban",
  banner_subtitle: "Akses lebih cepat & notifikasi langsung",
  delay_seconds: 5,
  reprompt_days: 0,
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
          .select("banner_enabled,banner_title,banner_subtitle,delay_seconds,reprompt_days")
          .eq("id", 1)
          .maybeSingle();
        if (mounted && data) setSettings({ ...DEFAULTS, ...(data as PwaSettings) });
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
          if (mounted && payload.new) setSettings({ ...DEFAULTS, ...(payload.new as PwaSettings) });
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