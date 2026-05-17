import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import strobanLogoFallback from "@/assets/stroban_white.png";

export interface Branding {
  brand_name: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  site_title: string | null;
  site_description: string | null;
}

const DEFAULT: Branding = {
  brand_name: "Sahabat Stroban",
  logo_light_url: null,
  logo_dark_url: null,
  favicon_url: null,
  site_title: null,
  site_description: null,
};

export const FALLBACK_LOGO = strobanLogoFallback;

export function useBranding() {
  const [branding, setBranding] = useState<Branding>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("app_branding")
          .select("brand_name, logo_light_url, logo_dark_url, favicon_url, site_title, site_description")
          .eq("id", 1)
          .maybeSingle();
        if (mounted && data) setBranding(data as Branding);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("app-branding-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_branding" },
        (payload) => {
          if (mounted && payload.new) setBranding(payload.new as Branding);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    branding,
    loading,
    logoLight: branding.logo_light_url || FALLBACK_LOGO,
    logoDark: branding.logo_dark_url || branding.logo_light_url || FALLBACK_LOGO,
    brandName: branding.brand_name || "Sahabat Stroban",
    siteTitle: branding.site_title || `${branding.brand_name || "Sahabat Stroban"} - Servis Mobil & Loyalty Rewards`,
    siteDescription: branding.site_description || "",
    faviconUrl: branding.favicon_url,
  };
}