import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HomeBanner {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  show_text: boolean;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface HomeBannerSettings {
  autoplay: boolean;
  interval_ms: number;
  max_slides: number;
}

export const BANNER_SETTINGS_KEY = "home.banner_settings";

export const DEFAULT_BANNER_SETTINGS: HomeBannerSettings = {
  autoplay: true,
  interval_ms: 4000,
  max_slides: 5,
};

export function normalizeBannerSettings(raw: unknown): HomeBannerSettings {
  const v = (raw ?? {}) as Partial<HomeBannerSettings>;
  return {
    autoplay: typeof v.autoplay === "boolean" ? v.autoplay : DEFAULT_BANNER_SETTINGS.autoplay,
    interval_ms:
      typeof v.interval_ms === "number" && v.interval_ms >= 1500 && v.interval_ms <= 30000
        ? v.interval_ms
        : DEFAULT_BANNER_SETTINGS.interval_ms,
    max_slides:
      typeof v.max_slides === "number" && v.max_slides >= 1 && v.max_slides <= 10
        ? Math.round(v.max_slides)
        : DEFAULT_BANNER_SETTINGS.max_slides,
  };
}

/** Public read: active banners + slider settings. */
export function useHomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [settings, setSettings] = useState<HomeBannerSettings>(DEFAULT_BANNER_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [bannerRes, settingRes] = await Promise.all([
          supabase
            .from("home_banners")
            .select("id,image_url,title,subtitle,show_text,link_url,sort_order,is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase.from("app_settings").select("value").eq("key", BANNER_SETTINGS_KEY).maybeSingle(),
        ]);

        if (cancelled) return;

        const nextSettings = normalizeBannerSettings(settingRes.data?.value);
        setSettings(nextSettings);
        setBanners(((bannerRes.data as HomeBanner[]) ?? []).slice(0, nextSettings.max_slides));
      } catch {
        if (!cancelled) setBanners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { banners, settings, loading };
}