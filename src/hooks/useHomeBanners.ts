import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useContentSync } from "@/hooks/useContentSync";
import { withAssetVersion } from "@/lib/imageVersion";

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

/** Don't refetch banners more than once per minute from focus/visibility events. */
const STALE_MS = 60_000;

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

  const lastFetch = useRef(0);

  const fetchAll = useCallback(async (signal?: { cancelled: boolean }) => {
      lastFetch.current = Date.now();
      try {
        const [bannerRes, settingRes] = await Promise.all([
          supabase
            .from("home_banners")
            .select("id,image_url,title,subtitle,show_text,link_url,sort_order,is_active,updated_at")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase.from("app_settings").select("value").eq("key", BANNER_SETTINGS_KEY).maybeSingle(),
        ]);

        if (signal?.cancelled) return;

        const nextSettings = normalizeBannerSettings(settingRes.data?.value);
        setSettings(nextSettings);
        const rows = ((bannerRes.data as (HomeBanner & { updated_at?: string })[]) ?? []).map((b) => ({
          ...b,
          image_url: withAssetVersion(b.image_url, b.updated_at),
        }));
        setBanners(rows.slice(0, nextSettings.max_slides));
      } catch {
        /* keep last known banners on transient errors */
      } finally {
        if (!signal?.cancelled) setLoading(false);
      }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void fetchAll(signal);

    // `visibilitychange` and `focus` both fire when a tab is re-opened, and a
    // single visit can flip focus many times. Only refetch when the cached
    // data is actually stale so one visit doesn't spray duplicate requests.
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetch.current < STALE_MS) return;
      void fetchAll();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      signal.cancelled = true;
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [fetchAll]);


  // Perubahan banner dari dashboard tampil seketika (realtime).
  useContentSync(["home_banners", "app_settings"], () => {
    void fetchAll();
  });

  return { banners, settings, loading, refresh: () => fetchAll() };
}