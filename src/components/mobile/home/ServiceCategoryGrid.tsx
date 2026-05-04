import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench, Droplets, ShieldCheck, RotateCcw, Car, Zap, Wind,
  ThermometerSun, Sparkles, Settings, Disc3,
  ChevronRight, Clock, CheckCircle2, ArrowRight, Info, MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// Mapping nama icon (string) dari DB -> komponen Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Wrench, Droplets, ShieldCheck, RotateCcw, Car, Zap, Wind,
  ThermometerSun, Sparkles, Settings, Disc3,
};
const getIcon = (name?: string | null): LucideIcon =>
  (name && ICON_MAP[name]) || Wrench;

// Style per kategori (label + warna gradient Apple-style).
// Setiap kategori punya gradient sendiri agar tampilan grid berwarna-warni
// (seperti referensi: Ganti Ban / Spooring / Balancing / Ganti Oli, dst).
const CATEGORY_STYLE: Record<string, { label: string; gradient: [string, string]; color: string; description: string }> = {
  tires:       { label: "Ban & Roda",       gradient: ["#FF4B4B", "#D63030"], color: "#E53935", description: "Ganti ban, spooring, balancing, & rotasi." },
  maintenance: { label: "Servis & Oli",     gradient: ["#FF7A45", "#E64A19"], color: "#E64A19", description: "Servis berkala, ganti oli, dan perawatan mesin." },
  ac:          { label: "AC Mobil",         gradient: ["#FF5C8A", "#D81B60"], color: "#D81B60", description: "Servis & isi ulang freon AC." },
  electrical:  { label: "Kelistrikan",      gradient: ["#FF6B6B", "#C2185B"], color: "#C2185B", description: "Aki, kabel, lampu, & sistem kelistrikan." },
  body:        { label: "Body & Eksterior", gradient: ["#FF5252", "#B71C1C"], color: "#B71C1C", description: "Cuci, poles, & detailing eksterior." },
};
const DEFAULT_STYLE = { label: "Lainnya", gradient: ["#FF4B4B", "#D63030"] as [string, string], color: "#E53935", description: "Layanan lainnya." };

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

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type Category = {
  key: string;
  label: string;
  gradient: [string, string];
  color: string;
  description: string;
  icon: LucideIcon;
  services: ServiceRow[];
};

// Helper: derive a darker shade from a hex color, used as 2nd gradient stop
const darken = (hex: string, factor = 0.78) => {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, Math.round(parseInt(h.substring(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(h.substring(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(h.substring(4, 6), 16) * factor)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

const ServiceCategoryGrid = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);

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

  // Group services per kategori
  const categories = useMemo<Category[]>(() => {
    const map = new Map<string, ServiceRow[]>();
    services.forEach((s) => {
      const key = s.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    const list: Category[] = Array.from(map.entries()).map(([key, items]) => {
      const style = CATEGORY_STYLE[key] || { ...DEFAULT_STYLE, label: key };
      // Icon kategori = icon service pertama dalam grup
      const icon = getIcon(items[0]?.icon);
      return {
        key,
        label: style.label,
        gradient: style.gradient,
        color: style.color,
        description: style.description,
        icon,
        services: items,
      };
    });
    // Urutkan sesuai urutan CATEGORY_STYLE (dikenal dulu), sisanya alfabet
    const order = Object.keys(CATEGORY_STYLE);
    list.sort((a, b) => {
      const ai = order.indexOf(a.key); const bi = order.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return list;
  }, [services]);

  // Hybrid mode: jika ada layanan yang di-pin (show_on_home=true), tile diisi
  // dari layanan tersebut. Jika tidak ada yang di-pin, fallback ke kategori.
  const pinnedServices = useMemo(
    () =>
      services
        .filter((s) => s.show_on_home)
        .sort((a, b) => (a.home_sort_order ?? 0) - (b.home_sort_order ?? 0)),
    [services]
  );

  // Build pinned tiles dari layanan ter-pin (each tile = single service category-style)
  const pinnedTiles = useMemo<Category[]>(() => {
    return pinnedServices.map((s) => {
      const catStyle = CATEGORY_STYLE[s.category] || DEFAULT_STYLE;
      const baseColor = s.home_color?.trim() || catStyle.gradient[0];
      const gradient: [string, string] = [baseColor, darken(baseColor, 0.78)];
      return {
        key: `svc-${s.id}`,
        label: s.name,
        gradient,
        color: baseColor,
        description: s.description || catStyle.description,
        icon: getIcon(s.icon),
        services: [s],
      };
    });
  }, [pinnedServices]);

  // Pakai pinned jika ada, kalau tidak fallback ke kategori
  const usePinned = pinnedTiles.length > 0;
  const tiles = useMemo(
    () => (usePinned ? pinnedTiles.slice(0, 7) : categories.slice(0, 7)),
    [usePinned, pinnedTiles, categories]
  );
  const hasMore = usePinned ? pinnedTiles.length > 7 : categories.length > 7;

  const openCategory = (cat: Category) => {
    setActiveCategory(cat);
    setSelectedService(cat.services.length === 1 ? cat.services[0] : null);
  };

  const closeSheet = () => {
    setActiveCategory(null);
    setSelectedService(null);
  };

  const handleBooking = () => {
    if (!activeCategory || !selectedService) return;
    closeSheet();
    navigate(`/booking?service=${selectedService.id}`);
  };

  return (
    <section className="lg:hidden" style={{ maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ padding: "12px 12px 16px" }}>
        <div
          className="relative"
          style={{
            background: "hsl(var(--card) / 0.72)",
            backdropFilter: "blur(22px) saturate(160%)",
            WebkitBackdropFilter: "blur(22px) saturate(160%)",
            border: "1px solid hsl(var(--border) / 0.6)",
            borderRadius: 24,
            boxShadow:
              "0 14px 32px -12px rgba(0,0,0,0.22), 0 4px 10px -4px rgba(0,0,0,0.08), inset 0 1px 0 hsl(var(--background) / 0.55)",
            padding: "12px 8px 10px",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <div className="flex items-center justify-between" style={{ padding: "2px 10px 8px" }}>
            <h2 className="text-foreground" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Layanan
            </h2>
            <button
              onClick={() => navigate("/katalog")}
              style={{ fontSize: 12, color: "#E53935", fontWeight: 600, minHeight: 32, padding: "0 4px" }}
              aria-label="Lihat semua layanan"
            >
              Lihat semua
            </button>
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
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => openCategory(cat)}
                  className="flex flex-col items-center justify-start press-tap rounded-2xl"
                  style={{ gap: 6, minHeight: 88 }}
                  aria-label={cat.label}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 60, height: 60, borderRadius: 16,
                      background: `linear-gradient(135deg, ${cat.gradient[0]} 0%, ${cat.gradient[1]} 100%)`,
                      boxShadow: `0 6px 14px ${tint(cat.gradient[1], 0.35)}`,
                    }}
                  >
                    <Icon style={{ width: 28, height: 28, color: "#ffffff" }} strokeWidth={2.2} />
                  </span>
                  <span
                    className="text-center"
                    style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--foreground))", lineHeight: 1.2 }}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
            {hasMore && (
              <button
                onClick={() => navigate("/katalog")}
                className="flex flex-col items-center justify-start press-tap rounded-2xl"
                style={{ gap: 6, minHeight: 88 }}
                aria-label="Lainnya"
              >
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 60, height: 60, borderRadius: 16,
                    background: "linear-gradient(135deg, #6B6B70 0%, #3A3A3C 100%)",
                    boxShadow: "0 6px 14px rgba(58,58,60,0.35)",
                  }}
                >
                  <MoreHorizontal style={{ width: 28, height: 28, color: "#ffffff" }} strokeWidth={2.2} />
                </span>
                <span
                  className="text-center"
                  style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--foreground))", lineHeight: 1.2 }}
                >
                  Lainnya
                </span>
              </button>
            )}
          </>
        )}
          </div>
        </div>
      </div>

      <Sheet open={!!activeCategory} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 max-h-[85vh] overflow-hidden flex flex-col"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {activeCategory && (
            <>
              <SheetHeader className="px-5 pt-5 pb-3 text-left">
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 44, height: 44, borderRadius: 12, background: tint(activeCategory.color, 0.14) }}
                  >
                    <activeCategory.icon style={{ width: 22, height: 22, color: activeCategory.color }} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <SheetTitle style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                      {activeCategory.label}
                    </SheetTitle>
                    <SheetDescription style={{ fontSize: 12, marginTop: 2 }}>
                      {activeCategory.description}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 pb-3">
                {activeCategory.services.length === 0 ? (
                  <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center", padding: "24px 0" }}>
                    Belum ada layanan untuk kategori ini.
                  </p>
                ) : (
                  <>
                    {activeCategory.services.length > 1 && (
                      <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                        Pilih Layanan
                      </p>
                    )}
                    <div className="flex flex-col" style={{ gap: 8 }}>
                      {activeCategory.services.map((svc) => {
                        const isActive = selectedService?.id === svc.id;
                        const SvcIcon = getIcon(svc.icon);
                        return (
                          <button
                            key={svc.id}
                            onClick={() => setSelectedService(svc)}
                            className="text-left press-card ripple"
                            style={{
                              border: `1.5px solid ${isActive ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--border))"}`,
                              background: isActive ? "hsl(var(--muted))" : "hsl(var(--card))",
                              borderRadius: 12,
                              padding: "12px 14px",
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="flex items-center justify-center shrink-0"
                                style={{ width: 32, height: 32, borderRadius: 8, background: tint(activeCategory.color, 0.14) }}
                              >
                                <SvcIcon style={{ width: 16, height: 16, color: activeCategory.color }} strokeWidth={2} />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="truncate"
                                    style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}
                                  >
                                    {svc.name}
                                  </span>
                                  {svc.badge && (
                                    <span
                                      style={{
                                        fontSize: 9, fontWeight: 600, padding: "1px 6px",
                                        borderRadius: 4, background: activeCategory.color, color: "#fff",
                                      }}
                                    >
                                      {svc.badge}
                                    </span>
                                  )}
                                  {isActive && (
                                    <CheckCircle2 style={{ width: 14, height: 14, color: activeCategory.color, flexShrink: 0 }} />
                                  )}
                                  {svc.description && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label="Lihat detail layanan"
                                          className="ml-auto flex items-center justify-center shrink-0 rounded-full"
                                          style={{
                                            width: 22, height: 22,
                                            background: tint(activeCategory.color, 0.12),
                                            color: activeCategory.color,
                                          }}
                                        >
                                          <Info style={{ width: 13, height: 13 }} strokeWidth={2.2} />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        side="top"
                                        align="end"
                                        className="w-72 p-3"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "hsl(var(--foreground))" }}>
                                          {svc.name}
                                        </p>
                                        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                          {svc.description}
                                        </p>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                                <div className="flex items-center" style={{ gap: 10, marginTop: 4 }}>
                                  <span className="flex items-center" style={{ gap: 3, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                                    <Clock style={{ width: 11, height: 11 }} />
                                    {svc.duration} mnt
                                  </span>
                                  {svc.price > 0 && (
                                    <span style={{ fontSize: 11, fontWeight: 600, color: activeCategory.color }}>
                                      {formatIDR(svc.price)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div
                className="px-5 pt-3 pb-4"
                style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
              >
                <button
                  onClick={handleBooking}
                  disabled={!selectedService}
                  className="w-full flex items-center justify-center press-tap ripple disabled:opacity-50"
                  style={{
                    gap: 6, height: 44, borderRadius: 12,
                    background: selectedService ? activeCategory.color : "hsl(var(--muted))",
                    color: "#fff", fontSize: 13.5, fontWeight: 600,
                    boxShadow: selectedService ? `0 4px 12px ${activeCategory.color}40` : "none",
                  }}
                >
                  Booking Sekarang
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default ServiceCategoryGrid;
