import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ServiceIcon from "@/components/admin/ServiceIcon";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { supabase } from "@/integrations/supabase/client";
// Gambar dibundel lokal (bukan URL CDN relatif) agar tetap tampil di
// aplikasi native Android/iOS yang memuat halaman dari berkas lokal.
import oilArt from "@/assets/service-oil.png";
import tireArt from "@/assets/service-tire.png";
import maintenanceArt from "@/assets/service-maintenance.png";
import discountArt from "@/assets/service-discount.png";

// Ilustrasi 3D per kategori (mockup). Dipetakan dari slug kategori.
const pickArt = (key: string, label: string): string | null => {
  const s = `${key} ${label}`.toLowerCase();
  if (s.includes("promo") || s.includes("diskon")) return discountArt;
  if (s.includes("oli") || s.includes("oil")) return oilArt;
  if (s.includes("ban") || s.includes("tire") || s.includes("tyre")) return tireArt;
  if (s.includes("servis") || s.includes("service") || s.includes("maintenance") || s.includes("paket"))
    return maintenanceArt;
  return null;
};

// Label 2 baris seperti mockup, tetap berbasis label kategori dari database.
const displayLabel = (key: string, label: string): string => {
  const s = `${key} ${label}`.toLowerCase();
  if (s.includes("promo") || s.includes("diskon")) return "Promo\n";
  if (s.includes("oli") || s.includes("oil")) return "Oli";
  if (s.includes("ban") || s.includes("tire") || s.includes("tyre")) return "Ban";
  if (s.includes("paket")) return "Paket\n\n";
  if (s.includes("servis") || s.includes("service") || s.includes("maintenance")) return "Paket\n\n";
  return label;
};

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
  const PREFERRED_ORDER = ["paket-ganti-oli", "tires", "maintenance", "promo-spesial"];
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
      <div style={{ padding: "0 12px 0", marginTop: 12, position: "relative", zIndex: 5 }}>
        <div className="relative" style={{ maxWidth: "100%", boxSizing: "border-box" }}>
          <div
            className="grid grid-cols-4"
            style={{ gap: 8, padding: "4px 0 0", maxWidth: "100%", boxSizing: "border-box" }}
          >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ borderRadius: 18, aspectRatio: "0.95" }} />
            ))
          : (
          <>
            {tiles.map((cat) => {
              const art = pickArt(cat.key, cat.label);
              const display = displayLabel(cat.key, cat.label);
              const words = display.trim().split(/\s+/);
              const line1 = words[0];
              const line2 = words.slice(1).join(" ");
              return (
                <button
                  key={cat.key}
                  onClick={() => openCategory(cat)}
                  className="glisses-tile relative flex flex-col items-center justify-start gap-0 press-tap text-center min-h-[44px]"
                  aria-label={cat.label}
                  style={{
                    padding: "2px 2px 7px",
                  }}
                >
                  {art ? (
                    <>
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: 68,
                          width: "70%",
                          height: 14,
                          transform: "translateX(-50%)",
                          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 70%)",
                          filter: "blur(5px)",
                          borderRadius: "50%",
                          pointerEvents: "none",
                          zIndex: 0,
                        }}
                      />
                      <img
                        src={art}
                        alt=""
                        loading="eager"
                        decoding="async"
                        style={{
                          position: "relative",
                          width: art === tireArt || art === maintenanceArt ? 120 : 102,
                          height: art === tireArt || art === maintenanceArt ? 120 : 102,
                          margin: art === tireArt || art === maintenanceArt ? "-23px 0 -25px" : "-14px 0 -16px",
                          filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.22))",
                          objectFit: "contain",
                          pointerEvents: "none",
                          zIndex: 1,
                        }}
                      />
                    </>
                  ) : (
                    <span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)" }}>
                      <ServiceIcon icon={cat.iconValue} className="h-9 w-9 text-primary" size={36} />
                    </span>
                  )}
                  <span
                    className="font-sans text-foreground relative z-[2]"
                    style={{ marginTop: -6, fontSize: 12, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.01em" }}
                  >
                    {line1.trim()}
                    {line2 ? (
                      <>
                        <br />
                        {line2}
                      </>
                    ) : null}
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
