import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Disc3, Car, RotateCcw, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_TIRE_IMAGE =
  "https://otomax.store/cdn/shop/articles/istockphoto-809822380-612x612.jpg?v=1730430682";

const BRAND_LOGOS: Record<string, string> = {
  Bridgestone:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Bridgestone_logo.svg/3840px-Bridgestone_logo.svg.png",
  "Gajah Tunggal":
    "https://www.gtradial.co.id/Content/images/gtradial-logo-border.png",
  Dunlop:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Dunlop_brand_logo.svg/1280px-Dunlop_brand_logo.svg.png",
};

const DARK_LOGO_BRANDS = new Set(["Bridgestone", "Dunlop"]);
const INITIAL_VISIBLE = 8;

interface Tire {
  id: string;
  brand: string;
  type: string;
  size: string;
  category: string;
  description: string | null;
  oem_compatibility: string[];
  image_url: string | null;
  logo_url: string | null;
  click_count: number;
}

const AUTO_SCROLL_SPEED = 1; // px per frame
const AUTO_SCROLL_PAUSE = 3000; // ms pause after interaction

const TireCatalogSection = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<Tire | null>(null);
  const { t } = useLanguage();

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const fetchTires = async () => {
      const { data } = await supabase
        .from("tires")
        .select("id, brand, type, size, category, description, oem_compatibility, image_url, logo_url, click_count")
        .eq("is_active", true)
        .order("click_count", { ascending: false });
      setTires((data as Tire[]) || []);
      setIsLoading(false);
    };
    fetchTires();
  }, []);

  // Determine popular threshold (top 20% by clicks, min 1 click)
  const popularIds = useMemo(() => {
    if (tires.length === 0) return new Set<string>();
    const sorted = [...tires].sort((a, b) => b.click_count - a.click_count);
    const topCount = Math.max(1, Math.ceil(tires.length * 0.2));
    const threshold = sorted[topCount - 1]?.click_count || 1;
    if (threshold < 1) return new Set<string>();
    return new Set(sorted.filter((t) => t.click_count >= threshold).map((t) => t.id));
  }, [tires]);

  const brands = useMemo(() => [...new Set(tires.map((t) => t.brand))].sort(), [tires]);
  const sizes = useMemo(() => [...new Set(tires.map((t) => t.size))].sort(), [tires]);

  const filtered = useMemo(() => {
    const result = tires.filter((tire) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        tire.brand.toLowerCase().includes(q) ||
        tire.type.toLowerCase().includes(q) ||
        tire.size.toLowerCase().includes(q);
      const matchesBrand = brandFilter === "all" || tire.brand === brandFilter;
      const matchesSize = sizeFilter === "all" || tire.size === sizeFilter;
      const matchesCategory = categoryFilter === "all" || tire.category === categoryFilter;
      return matchesSearch && matchesBrand && matchesSize && matchesCategory;
    });
    // Sort: popular first, then by click_count desc
    return result.sort((a, b) => {
      const aPopular = popularIds.has(a.id) ? 1 : 0;
      const bPopular = popularIds.has(b.id) ? 1 : 0;
      if (aPopular !== bPopular) return bPopular - aPopular;
      return b.click_count - a.click_count;
    });
  }, [tires, search, brandFilter, sizeFilter, categoryFilter, popularIds]);

  const hasActiveFilters = search || brandFilter !== "all" || sizeFilter !== "all" || categoryFilter !== "all";

  // Auto-scroll logic
  const startAutoScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const step = () => {
      if (!isPausedRef.current && el) {
        el.scrollLeft += AUTO_SCROLL_SPEED;
        // Loop back when reaching the end
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
          el.scrollLeft = 0;
        }
      }
      autoScrollRef.current = requestAnimationFrame(step);
    };
    autoScrollRef.current = requestAnimationFrame(step);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    isPausedRef.current = true;
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, AUTO_SCROLL_PAUSE);
  }, []);

  useEffect(() => {
    if (filtered.length > 0) startAutoScroll();
    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [filtered.length, startAutoScroll]);

  const scrollBy = useCallback((dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    pauseAutoScroll();
    el.scrollBy({ left: dir * 300, behavior: "smooth" });
  }, [pauseAutoScroll]);

  const resetFilters = () => {
    setSearch("");
    setBrandFilter("all");
    setSizeFilter("all");
    setCategoryFilter("all");
  };

  const handleCardClick = useCallback(async (tire: Tire) => {
    setSelected(tire);
    // Increment click count in background
    await supabase
      .from("tires")
      .update({ click_count: tire.click_count + 1 } as any)
      .eq("id", tire.id);
    // Update local state
    setTires((prev) =>
      prev.map((t) => (t.id === tire.id ? { ...t, click_count: t.click_count + 1 } : t))
    );
  }, []);

  const getLogoUrl = (tire: Tire) => tire.logo_url || BRAND_LOGOS[tire.brand] || null;

  const getLogoBgClass = (brand: string) =>
    DARK_LOGO_BRANDS.has(brand) ? "bg-white/80" : "bg-black/40";

  return (
    <section id="tire-catalog" className="py-4 md:py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <Badge className="mb-3 text-xs tracking-wider uppercase bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            <Disc3 className="h-3.5 w-3.5 mr-1.5 animate-spin" style={{ animationDuration: "3s" }} />
            {t.tireCatalog?.navLabel || "Katalog Ban"}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-foreground">
            {t.tireCatalog?.title || "Katalog Ban"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            {t.tireCatalog?.subtitle || "Jelajahi koleksi ban premium kami dari brand terpercaya"}
          </p>
        </div>

        {/* Sticky Filter Bar — Liquid Glass */}
        <div
          className="sticky top-16 z-30 -mx-4 px-4 py-3 mb-5 border-b border-primary/10"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card) / 0.7), hsl(var(--background) / 0.85))",
            backdropFilter: "blur(24px) saturate(1.8)",
            WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          }}
        >
          <div className="flex flex-col sm:flex-row gap-3 max-w-5xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
              <Input
                placeholder={t.tireCatalog?.searchPlaceholder || "Cari merek, tipe, atau ukuran..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full sm:w-[160px] border-primary/20">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Brand</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-full sm:w-[140px] border-primary/20">
                <SelectValue placeholder="Ukuran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Ukuran</SelectItem>
                {sizes.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px] border-primary/20">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="Passenger">Passenger</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={resetFilters} className="shrink-0 text-primary hover:text-primary hover:bg-primary/10">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              {t.tireCatalog?.noResults || "Ban tidak ditemukan"}
            </p>
            {hasActiveFilters && (
              <Button variant="link" onClick={resetFilters} className="mt-2 text-primary">
                Reset filter
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Navigation Arrows */}
            <button
              onClick={() => scrollBy(-1)}
              className="absolute -left-2 md:left-0 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full flex items-center justify-center bg-background/80 border border-border/60 shadow-lg backdrop-blur-md text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              className="absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full flex items-center justify-center bg-background/80 border border-border/60 shadow-lg backdrop-blur-md text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Horizontal Scroll Container */}
            <div
              ref={scrollRef}
              onTouchStart={pauseAutoScroll}
              onMouseDown={pauseAutoScroll}
              onWheel={pauseAutoScroll}
              className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide px-1 py-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filtered.map((tire) => {
                const logoUrl = getLogoUrl(tire);
                const isSelected = selected?.id === tire.id;
                const isPopular = popularIds.has(tire.id);
                return (
                  <div
                    key={tire.id}
                    onClick={() => handleCardClick(tire)}
                    className="group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ease-out hover:scale-[1.03] snap-start shrink-0 w-[260px] sm:w-[280px] md:w-[300px]"
                    style={{
                      background: "linear-gradient(145deg, hsl(var(--card) / 0.85), hsl(var(--card) / 0.6))",
                      backdropFilter: "blur(20px) saturate(1.5)",
                      WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                      border: isSelected
                        ? "2px solid hsl(var(--primary))"
                        : "1px solid hsl(var(--border) / 0.4)",
                      boxShadow: isSelected
                        ? "0 0 24px hsl(var(--primary) / 0.35), 0 8px 32px hsl(0 0% 0% / 0.15)"
                        : "0 2px 16px hsl(0 0% 0% / 0.1), 0 1px 4px hsl(0 0% 0% / 0.06)",
                    }}
                  >
                    {isPopular && (
                      <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold gap-1 shadow-md animate-pulse" style={{ animationDuration: "2s" }}>
                          <Flame className="h-3 w-3" />
                          Populer
                        </Badge>
                      </div>
                    )}

                    <div className="relative w-full aspect-[4/3] overflow-hidden">
                      <img
                        src={tire.image_url || DEFAULT_TIRE_IMAGE}
                        alt={`${tire.brand} ${tire.type}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(to top, hsl(var(--card)) 0%, transparent 50%)" }}
                      />
                      {logoUrl && (
                        <div className={`absolute top-3 left-3 ${getLogoBgClass(tire.brand)} backdrop-blur-md rounded-lg px-2 py-1.5`}>
                          <img src={logoUrl} alt={tire.brand} loading="lazy" className="h-5 w-auto max-w-[80px] object-contain" />
                        </div>
                      )}
                      {!isPopular && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="text-[10px] font-medium backdrop-blur-md bg-background/70">
                            {tire.category}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div
                      className="p-4 space-y-1.5"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--card) / 0.9), hsl(var(--card) / 0.7))",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-base text-foreground leading-tight">{tire.brand}</p>
                        {isPopular && (
                          <span className="text-[10px] text-primary font-medium">{tire.category}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-tight">{tire.type}</p>
                      <Badge variant="outline" className="text-xs font-mono mt-1 border-primary/30 text-primary">
                        {tire.size}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden rounded-2xl border border-primary/20 shadow-2xl"
          style={{
            background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
            boxShadow: "0 0 40px hsl(var(--primary) / 0.15), 0 20px 60px hsl(0 0% 0% / 0.3)",
          }}
        >
          <div className="relative">
            {/* Modal Image */}
            <div className="relative w-full aspect-[16/10] overflow-hidden">
              <img
                src={selected?.image_url || DEFAULT_TIRE_IMAGE}
                alt={selected ? `${selected.brand} ${selected.type}` : ""}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(to top, hsl(var(--card)) 0%, transparent 60%)",
                }}
              />
              {selected && getLogoUrl(selected) && (
                <div
                  className={`absolute bottom-4 left-4 ${getLogoBgClass(selected.brand)} backdrop-blur-md rounded-lg px-3 py-2`}
                >
                  <img
                    src={getLogoUrl(selected)!}
                    alt={selected.brand}
                    className="h-6 w-auto max-w-[100px] object-contain"
                  />
                </div>
              )}
              {selected && popularIds.has(selected.id) && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground text-xs font-semibold gap-1 shadow-lg">
                    <Flame className="h-3.5 w-3.5" />
                    Paling Sering Dicari
                  </Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <DialogHeader className="p-0">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {selected?.brand} — {selected?.type}
                </DialogTitle>
              </DialogHeader>

              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20">{selected?.brand}</Badge>
                <Badge variant="secondary">{selected?.category}</Badge>
                <Badge variant="outline" className="font-mono border-primary/30 text-primary">
                  {selected?.size}
                </Badge>
              </div>

              {selected?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selected.description}
                </p>
              )}

              {selected?.oem_compatibility && selected.oem_compatibility.length > 0 && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5 mb-2 text-foreground">
                    <Car className="h-4 w-4 text-primary" />
                    {t.tireCatalog?.oemTitle || "Kompatibilitas OEM"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.oem_compatibility.map((car, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-border/60">
                        {car}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default TireCatalogSection;
