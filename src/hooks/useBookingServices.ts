import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Service item used by booking pages (desktop Booking.tsx and
 * MobileBookingWizard.tsx). Pulls *all* marketing fields managed by admins in
 * the dashboard panel so the booking flow stays in sync with Service Manager
 * (badge, popular, sort_order, image, etc.) and Promos Manager (active promo
 * badge per category).
 */
export interface BookingService {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
  badge: string | null;
  is_popular: boolean;
  image_url: string | null;
  /** Most relevant active promo for this service's category, if any. */
  promo?: {
    id: string;
    title: string;
    badge: string | null;
    discount_type: string;
    discount_value: number;
  } | null;
}

type PromoRow = {
  id: string;
  title: string;
  badge: string | null;
  discount_type: string;
  discount_value: number;
  applicable_categories: string[] | null;
  sort_order: number;
};

/**
 * Fetch active services + active promos in parallel and merge them. Subscribes
 * to realtime changes on both tables so admin edits in the dashboard panel
 * propagate to the booking screens immediately.
 */
export const useBookingServices = () => {
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const [svcRes, promoRes] = await Promise.all([
        supabase
          .from("services")
          .select(
            "id,name,description,category,price,duration,badge,is_popular,image_url,sort_order"
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("promos")
          .select(
            "id,title,badge,discount_type,discount_value,applicable_categories,sort_order"
          )
          .eq("is_active", true)
          .lte("starts_at", new Date().toISOString())
          .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
          .order("sort_order", { ascending: true }),
      ]);

      if (!alive) return;

      const promos = (promoRes.data as PromoRow[] | null) || [];
      // Pre-index: category slug -> first matching promo
      const promoByCategory = new Map<string, PromoRow>();
      promos.forEach((p) => {
        (p.applicable_categories || []).forEach((c) => {
          if (!promoByCategory.has(c)) promoByCategory.set(c, p);
        });
      });

      const merged: BookingService[] = ((svcRes.data as any[]) || []).map(
        (s) => {
          const p = promoByCategory.get(s.category) || null;
          return {
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            price: Number(s.price) || 0,
            duration: Number(s.duration) || 0,
            badge: s.badge ?? null,
            is_popular: !!s.is_popular,
            image_url: s.image_url ?? null,
            promo: p
              ? {
                  id: p.id,
                  title: p.title,
                  badge: p.badge,
                  discount_type: p.discount_type,
                  discount_value: Number(p.discount_value) || 0,
                }
              : null,
          };
        }
      );

      setServices(merged);
      setLoading(false);
    };

    load();

    // Realtime: re-fetch when admin edits services or promos
    const ch = supabase
      .channel("booking-services-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promos" },
        () => load()
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  /** Short, human-readable promo label e.g. "DISKON 20%" or "POTONGAN 50RB". */
  const promoLabel = useMemo(
    () =>
      (promo: BookingService["promo"]): string | null => {
        if (!promo) return null;
        if (promo.badge && promo.badge.trim()) return promo.badge.trim();
        if (promo.discount_type === "percentage") {
          return `DISKON ${Math.round(promo.discount_value)}%`;
        }
        const v = promo.discount_value;
        const short =
          v >= 1_000_000
            ? `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}JT`
            : v >= 1_000
              ? `${Math.round(v / 1_000)}RB`
              : `${v}`;
        return `POTONGAN ${short}`;
      },
    []
  );

  return { services, loading, promoLabel };
};