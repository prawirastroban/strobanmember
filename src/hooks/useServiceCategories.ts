import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceCategoryOption {
  value: string; // slug
  label: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Single source of truth for service categories across the admin dashboard.
 * Reads from `service_categories` table — falls back to a sensible default
 * list so the UI never shows an empty dropdown if the table is unreachable.
 */
const FALLBACK: ServiceCategoryOption[] = [
  { value: "maintenance", label: "Perawatan Umum", sort_order: 1, is_active: true },
  { value: "tires", label: "Ban", sort_order: 2, is_active: true },
  { value: "electrical", label: "Kelistrikan", sort_order: 3, is_active: true },
  { value: "ac", label: "AC", sort_order: 4, is_active: true },
  { value: "body", label: "Body", sort_order: 5, is_active: true },
  { value: "engine", label: "Mesin", sort_order: 6, is_active: true },
  { value: "detailing", label: "Detailing", sort_order: 7, is_active: true },
];

export const useServiceCategories = (opts?: { activeOnly?: boolean }) => {
  const activeOnly = opts?.activeOnly ?? true;
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("service_categories")
        .select("slug,label,sort_order,is_active")
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      if (error || !data || data.length === 0) {
        setCategories(FALLBACK);
      } else {
        const mapped: ServiceCategoryOption[] = (data as any[]).map((c) => ({
          value: c.slug,
          label: c.label,
          sort_order: c.sort_order ?? 0,
          is_active: c.is_active ?? true,
        }));
        setCategories(activeOnly ? mapped.filter((c) => c.is_active) : mapped);
      }
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [activeOnly]);

  /** Lookup label by slug; falls back to capitalized slug. */
  const labelFor = (slug: string) => {
    const found = categories.find((c) => c.value === slug);
    if (found) return found.label;
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  return { categories, loading, labelFor };
};