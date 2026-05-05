import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  ChevronRight, Clock, CheckCircle2, MoreHorizontal, X, Plus,
} from "lucide-react";
import ServiceIcon from "@/components/admin/ServiceIcon";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

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

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

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
  const cart = useCart();
  const { categories: dbCategories } = useServiceCategories();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [previewService, setPreviewService] = useState<ServiceRow | null>(null);

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

  const tiles = useMemo(() => categories.slice(0, 7), [categories]);
  const hasMore = categories.length > 7;

  const openCategory = (cat: Category) => {
    setActiveCategory(cat);
    setSelectedService(cat.services.length === 1 ? cat.services[0] : null);
  };

  const closeSheet = () => {
    setActiveCategory(null);
    setSelectedService(null);
    setPreviewService(null);
  };

  const handleBooking = () => {
    if (!activeCategory || !selectedService) return;
    closeSheet();
    navigate(`/booking?service=${selectedService.id}`);
  };

  return (
    <section className="lg:hidden" style={{ maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ padding: "0 12px 16px", marginTop: -28, position: "relative", zIndex: 5 }}>
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
          <div className="flex items-center justify-between" style={{ padding: "0 8px 8px" }}>
            <h2 className="text-foreground text-2xl font-sans" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
              Layanan
            </h2>
            <button
              onClick={() => navigate("/katalog")}
              style={{ fontSize: 11.5, color: "#E53935", fontWeight: 600, minHeight: 28, padding: "0 2px" }}
              aria-label="Lihat semua layanan"
              className="text-center text-xs font-sans"
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
                  className="text-center font-sans text-xs"
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
                    <ServiceIcon icon={activeCategory.iconValue} className="h-[22px] w-[22px]" size={22} />
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
                        const isActive = cart.has(svc.id);
                        return (
                          <button
                            key={svc.id}
                            onClick={() => setPreviewService(svc)}
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
                                style={{ width: 32, height: 32, borderRadius: 8, background: tint(activeCategory.color, 0.14), color: activeCategory.color }}
                              >
                                <ServiceIcon icon={svc.icon} className="h-4 w-4" size={16} />
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
                                  <ChevronRight
                                    style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))", marginLeft: "auto", flexShrink: 0 }}
                                  />
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

              {cart.count > 0 && (
                <div
                  className="px-3 pt-2 pb-3"
                  style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                >
                  <button
                    onClick={() => {
                      closeSheet();
                      navigate("/booking?cart=1");
                    }}
                    className="w-full flex items-center gap-3 rounded-full px-4 py-3 text-left bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary-foreground/15 shrink-0">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold leading-tight">
                          {cart.count} layanan
                        </span>
                        <span className="text-sm font-bold leading-tight opacity-90">
                          · {formatIDR(cart.total)}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-90 truncate leading-tight mt-0.5">
                        Lanjutkan pesanan: {cart.count === 1 ? cart.items[0].name : `${cart.items[0].name} +${cart.count - 1} lainnya`}
                      </p>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        cart.clear();
                        toast.info("Pesanan dikosongkan");
                      }}
                      role="button"
                      className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 shrink-0 transition-colors"
                    >
                       <X className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Preview detail layanan — klik kartu buka dialog ini, lalu user konfirmasi pilih */}
      <Dialog open={!!previewService} onOpenChange={(o) => !o && setPreviewService(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          {previewService && activeCategory && (() => {
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 44, height: 44, borderRadius: 12, background: tint(activeCategory.color, 0.14), color: activeCategory.color }}
                    >
                      <ServiceIcon icon={previewService.icon} className="h-[22px] w-[22px]" size={22} />
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <DialogTitle style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
                        {previewService.name}
                      </DialogTitle>
                      <div className="flex items-center" style={{ gap: 10, marginTop: 4 }}>
                        <span className="flex items-center" style={{ gap: 3, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          <Clock style={{ width: 11, height: 11 }} />
                          {previewService.duration} mnt
                        </span>
                        {previewService.price > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: activeCategory.color }}>
                            {formatIDR(previewService.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {previewService.description && (
                  <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.55, whiteSpace: "pre-wrap", marginTop: 4 }}>
                    {previewService.description}
                  </p>
                )}

                <DialogFooter className="flex-row gap-2 sm:justify-between" style={{ marginTop: 8 }}>
                  <button
                    onClick={() => setPreviewService(null)}
                    className="flex-1 press-tap"
                    style={{
                      height: 42, borderRadius: 10,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  {(() => {
                    const inCart = cart.has(previewService.id);
                    return (
                      <button
                        onClick={() => {
                          if (inCart) {
                            cart.removeItem(previewService.id);
                            toast.info(`${previewService.name} dihapus dari pesanan`);
                          } else {
                            cart.addItem({
                              id: previewService.id,
                              name: previewService.name,
                              price: previewService.price,
                              duration: previewService.duration,
                              category: previewService.category,
                            });
                            toast.success(`${previewService.name} ditambahkan ke pesanan`);
                          }
                          setPreviewService(null);
                        }}
                        className="flex-1 flex items-center justify-center press-tap ripple"
                        style={{
                          gap: 6, height: 42, borderRadius: 10,
                          background: activeCategory.color, color: "#fff",
                          fontSize: 13, fontWeight: 700,
                          boxShadow: `0 4px 12px ${activeCategory.color}40`,
                        }}
                      >
                        {inCart ? (
                          <>
                            <X style={{ width: 15, height: 15 }} />
                            Hapus dari Pesanan
                          </>
                        ) : (
                          <>
                            <Plus style={{ width: 15, height: 15 }} />
                            Tambah ke Pesanan
                          </>
                        )}
                      </button>
                    );
                  })()}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ServiceCategoryGrid;
