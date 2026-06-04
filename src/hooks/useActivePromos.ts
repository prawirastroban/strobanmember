import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivePromo {
  id: string;
  title: string;
  description: string | null;
  badge: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  applicable_categories: string[] | null;
  applicable_service_ids: string[] | null;
  terms: string | null;
  sort_order: number;
}

interface UseActivePromosArgs {
  /** Selected service ID (catalog row). Optional. */
  serviceId?: string | null;
  /** Service category slug. Optional. */
  category?: string | null;
  /** Service base price; used to enforce min_purchase. */
  price?: number | null;
  /**
   * When true, only return promos that explicitly apply to "all services"
   * (both applicable_service_ids and applicable_categories empty).
   * Useful for legacy dialogs that don't use the catalog service IDs.
   */
  allServicesOnly?: boolean;
  enabled?: boolean;
}

/** Fetch currently-running promos and filter client-side by service/category/price. */
export function useActivePromos({
  serviceId,
  category,
  price,
  allServicesOnly = false,
  enabled = true,
}: UseActivePromosArgs) {
  const [promos, setPromos] = useState<ActivePromo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    (async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("promos")
        .select(
          "id,title,description,badge,discount_type,discount_value,min_purchase,applicable_categories,applicable_service_ids,terms,sort_order,starts_at,ends_at,is_active",
        )
        .eq("is_active", true)
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("sort_order", { ascending: true });
      if (!active) return;
      if (error) {
        console.error("useActivePromos error:", error);
        setPromos([]);
        setLoading(false);
        return;
      }
      const basePrice = Number(price || 0);
      const filtered = (data || []).filter((p: any) => {
        const ids: string[] = p.applicable_service_ids || [];
        const cats: string[] = p.applicable_categories || [];
        const minOk = !basePrice || Number(p.min_purchase || 0) <= basePrice;
        if (!minOk) return false;
        if (allServicesOnly) {
          return ids.length === 0 && cats.length === 0;
        }
        const idOk = ids.length === 0 || (serviceId ? ids.includes(serviceId) : false);
        const catOk = cats.length === 0 || (category ? cats.includes(category) : false);
        return idOk && catOk;
      });
      setPromos(filtered as ActivePromo[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [enabled, serviceId, category, price, allServicesOnly]);

  return { promos, loading };
}