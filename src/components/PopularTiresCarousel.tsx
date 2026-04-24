import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, ArrowRight } from "lucide-react";
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

const SCROLL_SPEED = 40;
const IDLE_RESUME_DELAY = 2500; // ms before auto-scroll resumes after drag

interface Props {
  tires: Tire[];
  onCardClick: (tire: Tire) => void;
}

const PopularTiresCarousel = ({ tires, onCardClick }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const singleSetWidthRef = useRef(0);
  const navigate = useNavigate();

  // Drag state refs (no re-renders)
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragOffsetStartRef = useRef(0);
  const velocityRef = useRef(0);
  const lastDragXRef = useRef(0);
  const lastDragTimeRef = useRef(0);
  const momentumRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayTires = useMemo(() => {
    const sorted = [...tires].sort((a, b) => b.click_count - a.click_count).slice(0, 10);
    const hasClicks = sorted.some((t) => t.click_count > 0);
    return hasClicks ? sorted : tires.slice(0, 10);
  }, [tires]);

  const loopItems = useMemo(() => {
    if (displayTires.length === 0) return [];
    return [...displayTires, ...displayTires, ...displayTires];
  }, [displayTires]);

  const getLogoUrl = (tire: Tire) => tire.logo_url || BRAND_LOGOS[tire.brand] || null;
  const getLogoBgClass = (brand: string) => DARK_LOGO_BRANDS.has(brand) ? "bg-white/80" : "bg-black/40";

  const measureWidth = useCallback(() => {
    const el = trackRef.current;
    if (!el || displayTires.length === 0) return;
    singleSetWidthRef.current = el.scrollWidth / 3;
  }, [displayTires.length]);

  const wrapOffset = useCallback(() => {
    if (singleSetWidthRef.current <= 0) return;
    while (offsetRef.current >= singleSetWidthRef.current) {
      offsetRef.current -= singleSetWidthRef.current;
    }
    while (offsetRef.current < 0) {
      offsetRef.current += singleSetWidthRef.current;
    }
  }, []);

  const applyTransform = useCallback(() => {
    const el = trackRef.current;
    if (el) {
      el.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
    }
  }, []);

  // Momentum decay
  const runMomentum = useCallback(() => {
    const friction = 0.95;
    const minVelocity = 0.3;

    const step = () => {
      if (Math.abs(velocityRef.current) < minVelocity) {
        velocityRef.current = 0;
        momentumRef.current = null;
        // Schedule auto-resume
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          isPausedRef.current = false;
          lastTimeRef.current = 0;
        }, IDLE_RESUME_DELAY);
        return;
      }
      offsetRef.current += velocityRef.current;
      wrapOffset();
      applyTransform();
      velocityRef.current *= friction;
      momentumRef.current = requestAnimationFrame(step);
    };
    momentumRef.current = requestAnimationFrame(step);
  }, [wrapOffset, applyTransform]);

  // Auto-scroll animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (!isPausedRef.current && !isDraggingRef.current && !document.hidden && singleSetWidthRef.current > 0) {
      offsetRef.current += (SCROLL_SPEED * delta) / 1000;
      wrapOffset();
      applyTransform();
    }

    animRef.current = requestAnimationFrame(animate);
  }, [wrapOffset, applyTransform]);

  useEffect(() => {
    if (displayTires.length <= 1) return;
    const timeout = setTimeout(() => {
      measureWidth();
      lastTimeRef.current = 0;
      animRef.current = requestAnimationFrame(animate);
    }, 100);
    return () => {
      clearTimeout(timeout);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (momentumRef.current) cancelAnimationFrame(momentumRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [displayTires.length, animate, measureWidth]);

  useEffect(() => {
    const onResize = () => measureWidth();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureWidth]);

  // --- Mouse drag handlers ---
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (momentumRef.current) { cancelAnimationFrame(momentumRef.current); momentumRef.current = null; }
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    isPausedRef.current = true;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragOffsetStartRef.current = offsetRef.current;
    lastDragXRef.current = e.clientX;
    lastDragTimeRef.current = performance.now();
    velocityRef.current = 0;
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = dragStartXRef.current - e.clientX;
    offsetRef.current = dragOffsetStartRef.current + dx;
    wrapOffset();
    applyTransform();

    const now = performance.now();
    const dt = now - lastDragTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (lastDragXRef.current - e.clientX) / dt * 16; // normalize to ~60fps
    }
    lastDragXRef.current = e.clientX;
    lastDragTimeRef.current = now;
  }, [wrapOffset, applyTransform]);

  const onMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (Math.abs(velocityRef.current) > 0.5) {
      runMomentum();
    } else {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        isPausedRef.current = false;
        lastTimeRef.current = 0;
      }, IDLE_RESUME_DELAY);
    }
  }, [runMomentum]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // --- Touch drag handlers ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (momentumRef.current) { cancelAnimationFrame(momentumRef.current); momentumRef.current = null; }
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    isPausedRef.current = true;
    isDraggingRef.current = true;
    const touch = e.touches[0];
    dragStartXRef.current = touch.clientX;
    dragOffsetStartRef.current = offsetRef.current;
    lastDragXRef.current = touch.clientX;
    lastDragTimeRef.current = performance.now();
    velocityRef.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    const dx = dragStartXRef.current - touch.clientX;
    offsetRef.current = dragOffsetStartRef.current + dx;
    wrapOffset();
    applyTransform();

    const now = performance.now();
    const dt = now - lastDragTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (lastDragXRef.current - touch.clientX) / dt * 16;
    }
    lastDragXRef.current = touch.clientX;
    lastDragTimeRef.current = now;
  }, [wrapOffset, applyTransform]);

  const onTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (Math.abs(velocityRef.current) > 0.5) {
      runMomentum();
    } else {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        isPausedRef.current = false;
        lastTimeRef.current = 0;
      }, IDLE_RESUME_DELAY);
    }
  }, [runMomentum]);

  // Hover pause (only if not dragging)
  const handleHoverPause = useCallback(() => {
    if (!isDraggingRef.current) isPausedRef.current = true;
  }, []);
  const handleHoverResume = useCallback(() => {
    if (!isDraggingRef.current) {
      isPausedRef.current = false;
      lastTimeRef.current = 0;
    }
  }, []);

  const handleBookNow = useCallback(async (e: React.MouseEvent, tire: Tire) => {
    e.stopPropagation();
    try {
      await supabase
        .from("tires")
        .update({ click_count: tire.click_count + 1 } as never)
        .eq("id", tire.id);
    } catch {}
    navigate("/booking");
  }, [navigate]);

  // Prevent click after drag
  const dragDistRef = useRef(0);
  const onCardClick2 = useCallback((tire: Tire, e: React.MouseEvent) => {
    // If user dragged more than 5px, suppress click
    if (dragDistRef.current > 5) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onCardClick(tire);
  }, [onCardClick]);

  // Track total drag distance for click suppression
  const onMouseDownWrapped = useCallback((e: React.MouseEvent) => {
    dragDistRef.current = 0;
    onMouseDown(e);
    const startX = e.clientX;
    const trackDist = (me: MouseEvent) => {
      dragDistRef.current = Math.abs(me.clientX - startX);
    };
    const cleanup = () => {
      window.removeEventListener("mousemove", trackDist);
      window.removeEventListener("mouseup", cleanup);
    };
    window.addEventListener("mousemove", trackDist);
    window.addEventListener("mouseup", cleanup);
  }, [onMouseDown]);

  if (displayTires.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          Popular Tires
        </h3>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Most purchased and recommended tires
        </span>
      </div>

      <div
        ref={containerRef}
        className={`relative overflow-hidden select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseEnter={handleHoverPause}
        onMouseLeave={handleHoverResume}
        onMouseDown={onMouseDownWrapped}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent" />

        <div
          ref={trackRef}
          className="flex gap-2 sm:gap-5 will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          {loopItems.map((tire, idx) => {
            const logoUrl = getLogoUrl(tire);
            return (
                <div
                  key={`${tire.id}-${idx}`}
                  onClick={(e) => onCardClick2(tire, e)}
                  className="group product-card rounded-2xl shrink-0 w-[140px] sm:w-[210px] md:w-[220px]"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.5)",
                    boxShadow: "0 2px 12px hsl(0 0% 0% / 0.08)",
                  }}
                >
                  <div className="absolute top-1 right-1 sm:top-3 sm:right-3 z-10">
                    <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold gap-0.5 sm:gap-1 shadow-md px-1.5 py-0 sm:px-2 sm:py-0.5">
                      <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      #{(idx % displayTires.length) + 1}
                    </Badge>
                  </div>

                <div className="relative w-full h-[110px] sm:h-[150px] md:h-[160px] overflow-hidden bg-muted/30">
                  <img
                    src={tire.image_url || DEFAULT_TIRE_IMAGE}
                    alt={`${tire.brand} ${tire.type}`}
                    loading="lazy"
                    draggable={false}
                    onLoad={(e) => e.currentTarget.classList.add("loaded")}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_TIRE_IMAGE; e.currentTarget.classList.add("loaded"); }}
                    className="w-full h-full object-cover img-fade transition-transform duration-500 ease-out group-hover:scale-110 pointer-events-none"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(to top, hsl(var(--card)) 0%, transparent 50%)" }}
                  />
                  {logoUrl && (
                    <div className={`absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 ${getLogoBgClass(tire.brand)} backdrop-blur-md rounded px-1.5 py-0.5 sm:px-2 sm:py-1`}>
                      <img src={logoUrl} alt={tire.brand} loading="lazy" draggable={false} onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-3 sm:h-4 w-auto max-w-[50px] sm:max-w-[70px] object-contain pointer-events-none" />
                    </div>
                  )}
                </div>

                <div className="relative p-2.5 sm:p-3 space-y-1 sm:space-y-1.5">
                  <p className="font-semibold text-xs sm:text-sm text-foreground leading-tight truncate">{tire.brand}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight truncate">{tire.type}</p>
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="outline" className="text-[10px] sm:text-[11px] font-mono border-primary/30 text-primary px-1.5 py-0 truncate">
                      {tire.size}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0 truncate">
                      {tire.category}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-1.5 gap-1 text-[11px] sm:text-xs font-semibold glow-btn h-7 sm:h-8 px-2"
                    onClick={(e) => handleBookNow(e, tire)}
                  >
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="truncate">Booking</span>
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
