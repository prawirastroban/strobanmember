import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

// Speed: pixels per second for the continuous scroll
const SCROLL_SPEED = 40;

interface Props {
  tires: Tire[];
  onCardClick: (tire: Tire) => void;
}

const PopularTiresCarousel = ({ tires, onCardClick }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const singleSetWidthRef = useRef(0);
  const navigate = useNavigate();

  // Pick top 10 popular tires
  const displayTires = useMemo(() => {
    const sorted = [...tires].sort((a, b) => b.click_count - a.click_count).slice(0, 10);
    const hasClicks = sorted.some((t) => t.click_count > 0);
    return hasClicks ? sorted : tires.slice(0, 10);
  }, [tires]);

  // Duplicate items 3x to create seamless loop
  const loopItems = useMemo(() => {
    if (displayTires.length === 0) return [];
    return [...displayTires, ...displayTires, ...displayTires];
  }, [displayTires]);

  const getLogoUrl = (tire: Tire) => tire.logo_url || BRAND_LOGOS[tire.brand] || null;
  const getLogoBgClass = (brand: string) => DARK_LOGO_BRANDS.has(brand) ? "bg-white/80" : "bg-black/40";

  // Measure one set width
  const measureWidth = useCallback(() => {
    const el = trackRef.current;
    if (!el || displayTires.length === 0) return;
    // Total width / 3 sets
    singleSetWidthRef.current = el.scrollWidth / 3;
  }, [displayTires.length]);

  // GPU-accelerated animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (!isPausedRef.current && !document.hidden && singleSetWidthRef.current > 0) {
      offsetRef.current += (SCROLL_SPEED * delta) / 1000;

      // Seamless reset: when we've scrolled one full set, jump back
      if (offsetRef.current >= singleSetWidthRef.current) {
        offsetRef.current -= singleSetWidthRef.current;
      }

      const el = trackRef.current;
      if (el) {
        el.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (displayTires.length <= 1) return;

    // Wait for layout to settle
    const timeout = setTimeout(() => {
      measureWidth();
      lastTimeRef.current = 0;
      animRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [displayTires.length, animate, measureWidth]);

  // Recalculate on resize
  useEffect(() => {
    const onResize = () => measureWidth();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureWidth]);

  const handlePause = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const handleResume = useCallback(() => {
    isPausedRef.current = false;
    lastTimeRef.current = 0;
  }, []);

  const handleCheckout = useCallback(async (e: React.MouseEvent, tire: Tire) => {
    e.stopPropagation();
    // Track click
    try {
      await supabase
        .from("tires")
        .update({ click_count: tire.click_count + 1 } as never)
        .eq("id", tire.id);
    } catch {}
    navigate("/booking");
  }, [navigate]);

  if (displayTires.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          Popular Tires
        </h3>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Most purchased and recommended tires
        </span>
      </div>

      {/* Carousel container with gradient edges */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
      >
        {/* Left gradient fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent" />
        {/* Right gradient fade */}
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent" />

        {/* Track — uses transform for GPU acceleration, NO scrollbar */}
        <div
          ref={trackRef}
          className="flex gap-5 will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          {loopItems.map((tire, idx) => {
            const logoUrl = getLogoUrl(tire);
            return (
              <div
                key={`${tire.id}-${idx}`}
                onClick={() => onCardClick(tire)}
                className="group relative cursor-pointer rounded-2xl overflow-hidden shrink-0 w-[240px] sm:w-[270px] md:w-[280px] transition-all duration-300 ease-out hover:scale-[1.04] hover:shadow-xl"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border) / 0.5)",
                  boxShadow: "0 2px 12px hsl(0 0% 0% / 0.08)",
                }}
              >
                {/* Rank badge */}
                <div className="absolute top-3 left-3 z-10">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold gap-1 shadow-md">
                    <Flame className="h-3 w-3" />
                    #{(idx % displayTires.length) + 1}
                  </Badge>
                </div>
                {/* Category badge */}
                <div className="absolute top-3 right-3 z-10">
                  <Badge variant="secondary" className="text-[10px] font-medium backdrop-blur-md bg-background/70">
                    {tire.category}
                  </Badge>
                </div>

                {/* Image */}
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  <img
                    src={tire.image_url || DEFAULT_TIRE_IMAGE}
                    alt={`${tire.brand} ${tire.type}`}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_TIRE_IMAGE; }}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(to top, hsl(var(--card)) 0%, transparent 50%)" }}
                  />
                  {logoUrl && (
                    <div className={`absolute bottom-3 left-3 ${getLogoBgClass(tire.brand)} backdrop-blur-md rounded-lg px-2 py-1.5`}>
                      <img
                        src={logoUrl}
                        alt={tire.brand}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                        className="h-5 w-auto max-w-[80px] object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <p className="font-semibold text-base text-foreground leading-tight">{tire.brand}</p>
                  <p className="text-sm text-muted-foreground leading-tight truncate">{tire.type}</p>
                  <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                    {tire.size}
                  </Badge>

                  {/* Checkout button */}
                  <Button
                    size="sm"
                    className="w-full mt-2 gap-2 text-xs font-semibold"
                    onClick={(e) => handleCheckout(e, tire)}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Checkout Now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PopularTiresCarousel;
