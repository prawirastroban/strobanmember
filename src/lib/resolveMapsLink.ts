import { supabase } from "@/integrations/supabase/client";

export async function resolveShortMapsLink(
  url: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("resolve-maps-link", {
      body: { url },
    });
    if (error) return null;
    const r = data as { success?: boolean; lat?: number; lng?: number };
    if (!r?.success || typeof r.lat !== "number" || typeof r.lng !== "number") return null;
    return { lat: r.lat, lng: r.lng };
  } catch {
    return null;
  }
}