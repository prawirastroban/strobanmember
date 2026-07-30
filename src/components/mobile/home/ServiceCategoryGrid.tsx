import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ServiceIcon from "@/components/admin/ServiceIcon";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { supabase } from "@/integrations/supabase/client";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
  icon: string;
  badge: string | null;
  sort_order: number;
  show_on_home?: boolean;
  home_sort_order?: number;
  home_color?: string | null;
};


// Style per kategori (label + warna gradient Apple-style).
// Setiap kategori punya gradient sendiri agar tampilan grid berwarna-warni
// (seperti referensi: Ganti Ban / Spooring / Balancing / Ganti Oli, dst).
// Visual defaults per kategori (gradient + warna). Label kategori diambil dari
// tabel `service_categories` via useServiceCategories hook (single source of truth).
const CATEGORY_STYLE: Record<string, { gradient: [string, string]; color: string; description: string }> = {
  tires:       { gradient: ["#FF4B4B", "#D63030"], color: "#E53935", description: "Ganti ban, spooring, balancing, & rotasi." },
  maintenance: { gradient: ["#FF7A45", "#E64A19"], color: "#E64A19", description: "Servis berkala, ganti oli, dan perawatan mesin." },
  ac:          { gradient: ["#FF5C8A", "#D81B60"], color: "#D81B60", description: "Servis & isi ulang freon AC." },
  electrical:  { gradient: ["#FF6B6B", "#C2185B"], color: "#C2185B", description: "Aki, kabel, lampu, & sistem kelistrikan." },
  body:        { gradient: ["#FF5252", "#B71C1C"], color: "#B71C1C", description: "Cuci, poles, & detailing eksterior." },
};
const DEFAULT_STYLE = { gradient: ["#FF4B4B", "#D63030"] as [string, string], color: "#E53935", description: "Layanan lainnya." };

// Convert hex (#RRGGBB) to rgba string with given alpha. Used so the
// "tinted" background works on BOTH light and dark themes — instead of
// hardcoded pastel `bg` colors that wash out text in dark mode.
const tint = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Category = {
  key: string;
  label: string;
  gradient: [string, string];
  color: string;
  description: string;
  iconValue: string;
  services: ServiceRow[];
};

const ServiceCategoryGrid = () => {
  const navigate = useNavigate();
  const { categories: dbCategories } = useServiceCategories();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load + realtime sync dari setting marketing/services di dashboard
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("services")
        .select("id,name,description,category,price,duration,icon,badge,sort_order,show_on_home,home_sort_order,home_color")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!cancelled) {
        setServices((data as ServiceRow[]) || []);
        setLoading(false);
      }
    };
    load();
    const channel = supabase
      .channel("services-home-grid")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Bangun tile dari `service_categories` (single source of truth, sudah
  // is_active only + realtime sync). Tiap tile berisi semua services
  // dengan slug kategori yang sama. Kategori baru / layanan baru langsung
  // muncul tanpa reload.
  const categories = useMemo<Category[]>(() => {
    return dbCategories.map((cat) => {
      const items = services.filter((s) => (s.category || "other") === cat.value);
      const style = CATEGORY_STYLE[cat.value] || DEFAULT_STYLE;
      const iconValue = items[0]?.icon || "Wrench";
      return {
        key: cat.value,
        label: cat.label,
        gradient: style.gradient,
        color: style.color,
        description: style.description,
        iconValue,
        services: items,
      };
    });
  }, [dbCategories, services]);

  // Preferred display order on home grid. Keys not listed keep their original
  // order after the preferred ones.
  const PREFERRED_ORDER = ["maintenance", "tires", "paket-ganti-oli", "promo-spesial"];
  const tiles = useMemo(() => {
    const rank = (key: string) => {
      const i = PREFERRED_ORDER.indexOf(key);
      return i === -1 ? PREFERRED_ORDER.length : i;
    };
    return [...categories]
      .sort((a, b) => rank(a.key) - rank(b.key))
      .slice(0, 4);
  }, [categories]);

  const openCategory = (cat: Category) => {
    navigate(`/katalog?category=${encodeURIComponent(cat.key)}`);
  };

  return (
    <section className="lg:hidden" style={{ maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ padding: "0 12px 16px", marginTop: 12, position: "relative", zIndex: 5 }}>
        <div
          className="relative"
          style={{
            background: "hsl(var(--card) / 0.72)",
            backdropFilter: "blur(22px) saturate(160%)",
            WebkitBackdropFilter: "blur(22px) saturate(160%)",
            border: "1px solid hsl(var(--border) / 0.6)",
            borderRadius: 28,
            boxShadow:
              "0 22px 48px -16px rgba(0,0,0,0.32), 0 8px 18px -6px rgba(0,0,0,0.12), inset 0 1px 0 hsl(var(--background) / 0.6)",
            padding: "18px 10px 14px",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ padding: "0 8px 8px" }}>
            <h2 className="text-foreground text-2xl font-sans" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
              Layanan
            </h2>
          </div>

          <div
            className="grid grid-cols-4"
            style={{ gap: 12, padding: "2px 8px 4px", maxWidth: "100%", boxSizing: "border-box" }}
          >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center" style={{ gap: 6, minHeight: 88 }}>
                <div className="shimmer" style={{ width: 60, height: 60, borderRadius: 16 }} />
                <div className="shimmer" style={{ width: 48, height: 8, borderRadius: 4 }} />
              </div>
            ))
          : (
          <>
            {tiles.map((cat) => {
              return (
                <button
                  key={cat.key}
                  onClick={() => openCategory(cat)}
                  className="flex flex-col items-center justify-start press-tap rounded-2xl"
                  style={{ gap: 6, minHeight: 88 }}
                  aria-label={cat.label}
                >
                  <span
                    className="flex items-center justify-center text-white"
                    style={{
                      width: 60, height: 60, borderRadius: 16,
                      background: `linear-gradient(135deg, ${cat.gradient[0]} 0%, ${cat.gradient[1]} 100%)`,
                      boxShadow: `0 6px 14px ${tint(cat.gradient[1], 0.35)}`,
                      color: "#ffffff",
                    }}
                  >
                    <ServiceIcon icon={cat.iconValue} className="h-7 w-7 text-white" size={28} />
                  </span>
                  <span
                    className="text-center font-sans text-xs"
                    style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--foreground))", lineHeight: 1.2 }}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </>
        )}
          </div>
        </div>
      </div>

    </section>
  );
};

export default ServiceCategoryGrid;
