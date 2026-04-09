import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Flame, ChevronLeft, ChevronRight, Car } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DEFAULT_TIRE_IMAGE = "/placeholder.svg";

const BRAND_LOGOS: Record<string, string> = {
  Bridgestone: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Bridgestone_logo.svg/3840px-Bridgestone_logo.svg.png",
  "Gajah Tunggal": "https://www.gtradial.co.id/Content/images/gtradial-logo-border.png",
  Dunlop: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Dunlop_brand_logo.svg/1280px-Dunlop_brand_logo.svg.png",
};
const DARK_LOGO_BRANDS = new Set(["Bridgestone", "Dunlop"]);

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

const AUTO_SLIDE_INTERVAL = 3500; // ms
const IDLE_RESUME_DELAY = 5000; // ms

interface Props {
  tires: Tire[];
  onCardClick: (tire: Tire) => void;
}

const PopularTiresCarousel = ({ tires, onCardClick }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selected, setSelected] = useState<Tire | null>(null);

  // Top 10 most clicked, fallback to latest
  const popular = tires
    .slice()
    .sort((a, b) => b.click_count - a.click_count)
    .slice(0, 10);

  const hasClicks = popular.some((t) => t.click_count > 0);
  const displayTires = hasClicks ? popular : tires.slice(0, 10);

  const getLogoUrl = (tire: Tire) => tire.logo_url || BRAND_LOGOS[tire.brand] || null;
  const getLogoBgClass = (brand: string) => DARK_LOGO_BRANDS.has(brand) ? "bg-white/80" : "bg-black/40";

  const scrollToNext = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 280 + 16; // card + gap
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (el.scrollLeft >= maxScroll - 4) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: cardWidth, behavior: "smooth" });
    }
  }, []);

  const startAutoSlide = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!document.hidden) scrollToNext();
    }, AUTO_SLIDE_INTERVAL);
  }, [scrollToNext]);

  const pauseAutoSlide = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      startAutoSlide();
    }, IDLE_RESUME_DELAY);
  }, [startAutoSlide]);

  useEffect(() => {
    if (displayTires.length > 1) startAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [displayTires.length, startAutoSlide]);

  const scrollBy = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    pauseAutoSlide();
    el.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  const handleClick = (tire: Tire) => {
    setSelected(tire);
    onCardClick(tire);
  };

  if (displayTires.length === 0) return null;

  return (
    <>
      <div className="mb-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            Popular Tires
          </h3>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Paling sering dilihat oleh pelanggan
          </span>
        </div>

        {/* Carousel */}
        <div className="relative">
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

          <div
            ref={scrollRef}
            onTouchStart={pauseAutoSlide}
            onMouseEnter={pauseAutoSlide}
            onMouseLeave={() => { setIsPaused(false); startAutoSlide(); }}
            onWheel={pauseAutoSlide}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-1 py-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {displayTires.map((tire, idx) => {
              const logoUrl = getLogoUrl(tire);
              return (
                <div
                  key={tire.id}
                  onClick={() => handleClick(tire)}
                  className="group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ease-out hover:scale-[1.03] snap-start shrink-0 w-[260px] sm:w-[280px]"
                  style={{
                    background: "linear-gradient(145deg, hsl(var(--card) / 0.85), hsl(var(--card) / 0.6))",
                    backdropFilter: "blur(20px) saturate(1.5)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                    border: "1px solid hsl(var(--border) / 0.4)",
                    boxShadow: "0 2px 16px hsl(0 0% 0% / 0.1)",
                  }}
                >
                  {/* Rank badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold gap-1 shadow-md">
                      <Flame className="h-3 w-3" />
                      #{idx + 1}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 z-10">
                    <Badge variant="secondary" className="text-[10px] font-medium backdrop-blur-md bg-background/70">
                      {tire.category}
                    </Badge>
                  </div>

                  <div className="relative w-full aspect-[4/3] overflow-hidden">
                    <img
                      src={tire.image_url || DEFAULT_TIRE_IMAGE}
                      alt={`${tire.brand} ${tire.type}`}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_TIRE_IMAGE; }}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, hsl(var(--card)) 0%, transparent 50%)" }} />
                    {logoUrl && (
                      <div className={`absolute bottom-3 left-3 ${getLogoBgClass(tire.brand)} backdrop-blur-md rounded-lg px-2 py-1.5`}>
                        <img src={logoUrl} alt={tire.brand} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-5 w-auto max-w-[80px] object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5" style={{ background: "linear-gradient(135deg, hsl(var(--card) / 0.9), hsl(var(--card) / 0.7))" }}>
                    <p className="font-semibold text-base text-foreground leading-tight">{tire.brand}</p>
                    <p className="text-sm text-muted-foreground leading-tight">{tire.type}</p>
                    <Badge variant="outline" className="text-xs font-mono mt-1 border-primary/30 text-primary">{tire.size}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          {selected && (
            <div className="relative">
              <div className="relative w-full aspect-[16/10] overflow-hidden">
                <img src={selected.image_url || DEFAULT_TIRE_IMAGE} alt={`${selected.brand} ${selected.type}`} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_TIRE_IMAGE; }} className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, hsl(var(--card)) 0%, transparent 60%)" }} />
                {getLogoUrl(selected) && (
                  <div className={`absolute bottom-4 left-4 ${getLogoBgClass(selected.brand)} backdrop-blur-md rounded-lg px-3 py-2`}>
                    <img src={getLogoUrl(selected)!} alt={selected.brand} onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-6 w-auto max-w-[100px] object-contain" />
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">{selected.brand} — {selected.type}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">Detail katalog ban, kompatibilitas OEM, dan visual produk.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border-primary/20">{selected.brand}</Badge>
                  <Badge variant="secondary">{selected.category}</Badge>
                  <Badge variant="outline" className="font-mono border-primary/30 text-primary">{selected.size}</Badge>
                </div>
                {selected.description && <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>}
                {selected.oem_compatibility.length > 0 && (
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5 mb-2 text-foreground"><Car className="h-4 w-4 text-primary" />Kompatibilitas OEM</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.oem_compatibility.map((car, i) => <Badge key={i} variant="outline" className="text-xs border-border/60">{car}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PopularTiresCarousel;
