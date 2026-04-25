import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench, Droplets, ShieldCheck, RotateCcw, Car, Zap, Wind,
  ThermometerSun, Sparkles, Settings, Disc3, MoreHorizontal,
  ChevronRight, Clock, CheckCircle2, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
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
};

// Mapping nama icon (string) dari DB -> komponen Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Wrench, Droplets, ShieldCheck, RotateCcw, Car, Zap, Wind,
  ThermometerSun, Sparkles, Settings, Disc3,
};
const getIcon = (name?: string | null): LucideIcon =>
  (name && ICON_MAP[name]) || Wrench;

// Style per kategori (label + warna). Kategori di luar daftar tetap ditampilkan dengan default.
const CATEGORY_STYLE: Record<string, { label: string; bg: string; color: string; description: string }> = {
  maintenance: { label: "Servis & Oli",   bg: "#f0fff4", color: "#2E7D32", description: "Servis berkala, ganti oli, dan perawatan mesin." },
  tires:       { label: "Ban & Roda",      bg: "#fff5f5", color: "#E53935", description: "Ganti ban, spooring, balancing, & rotasi." },
  electrical:  { label: "Kelistrikan",     bg: "#fff8f0", color: "#F57C00", description: "Aki, kabel, lampu, & sistem kelistrikan." },
  ac:          { label: "AC Mobil",        bg: "#f0f8ff", color: "#1565C0", description: "Servis & isi ulang freon AC." },
  body:        { label: "Body & Eksterior",bg: "#fdf0ff", color: "#7B1FA2", description: "Cuci, poles, & detailing eksterior." },
};
const DEFAULT_STYLE = { label: "Lainnya", bg: "#f5f5f5", color: "#8e8e93", description: "Layanan lainnya." };

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type Category = {
  key: string;
  label: string;
  bg: string;
  color: string;
  description: string;
  icon: LucideIcon;
  services: ServiceRow[];
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
        .select("id,name,description,category,price,duration,icon,badge,sort_order")
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
        bg: style.bg,
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

  // Tambah tile "Lainnya" di akhir untuk akses katalog penuh
  const tiles = useMemo(() => {
    const base = categories.slice(0, 7);
    const showAll: Category = {
      key: "__all__",
      label: "Lainnya",
      bg: DEFAULT_STYLE.bg,
      color: DEFAULT_STYLE.color,
      description: DEFAULT_STYLE.description,
      icon: MoreHorizontal,
      services: [],
    };
    return [...base, showAll];
  }, [categories]);

  const openCategory = (cat: Category) => {
    if (cat.key === "__all__") { navigate("/katalog"); return; }
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
      <div className="flex items-center justify-between" style={{ padding: "16px 16px 8px" }}>
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
        style={{ gap: 8, padding: "0 16px", maxWidth: "100%", boxSizing: "border-box" }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center" style={{ gap: 5, minHeight: 76 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "hsl(var(--muted))" }} />
                <div style={{ width: 44, height: 8, borderRadius: 4, background: "hsl(var(--muted))" }} />
              </div>
            ))
          : tiles.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => openCategory(cat)}
                  className="flex flex-col items-center justify-start press-tap ripple rounded-2xl"
                  style={{ gap: 5, minHeight: 76 }}
                  aria-label={cat.label}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{ width: 48, height: 48, borderRadius: 14, background: cat.bg }}
                  >
                    <Icon style={{ width: 22, height: 22, color: cat.color }} strokeWidth={2} />
                  </span>
                  <span
                    className="text-center"
                    style={{ fontSize: 10, fontWeight: 500, color: "hsl(var(--foreground))", lineHeight: 1.2 }}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
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
                    style={{ width: 44, height: 44, borderRadius: 12, background: activeCategory.bg }}
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
                            className="text-left transition-all active:scale-[0.99]"
                            style={{
                              border: `1.5px solid ${isActive ? activeCategory.color : "hsl(var(--border))"}`,
                              background: isActive ? activeCategory.bg : "hsl(var(--card))",
                              borderRadius: 12,
                              padding: "12px 14px",
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="flex items-center justify-center shrink-0"
                                style={{ width: 32, height: 32, borderRadius: 8, background: activeCategory.bg }}
                              >
                                <SvcIcon style={{ width: 16, height: 16, color: activeCategory.color }} strokeWidth={2} />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
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
                                    <CheckCircle2 style={{ width: 14, height: 14, color: activeCategory.color }} />
                                  )}
                                </div>
                                {svc.description && (
                                  <p style={{ fontSize: 11.5, color: "hsl(var(--muted-foreground))", marginTop: 3, lineHeight: 1.4 }}>
                                    {svc.description}
                                  </p>
                                )}
                                <div className="flex items-center flex-wrap" style={{ gap: 10, marginTop: 6 }}>
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
                              {!isActive && activeCategory.services.length > 1 && (
                                <ChevronRight style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))", marginTop: 2 }} />
                              )}
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
                  className="w-full flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50"
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
