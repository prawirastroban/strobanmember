import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHomeBanners, type HomeBanner } from "@/hooks/useHomeBanners";
import heroBg from "@/assets/hero-bengkel.jpg";

const FALLBACK_SLIDE: HomeBanner = {
  id: "fallback",
  image_url: heroBg,
  title: "Halo kak, Mau servis apa ?",
  subtitle: "Booking sekarang, langsung dikerjakan",
  show_text: true,
  link_url: null,
  sort_order: 0,
  is_active: true,
};

const OVERLAY =
  "linear-gradient(160deg, rgba(15,20,35,0.88) 0%, rgba(20,28,45,0.82) 40%, rgba(26,26,46,0.88) 100%)";

const HomeBannerSlider = () => {
  const navigate = useNavigate();
  const { banners, settings, loading } = useHomeBanners();
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const slides = banners.length > 0 ? banners : [FALLBACK_SLIDE];
  const count = slides.length;

  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (!settings.autoplay || count < 2) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % count);
    }, settings.interval_ms);
    return () => window.clearInterval(id);
  }, [settings.autoplay, settings.interval_ms, count]);

  const handleSlideClick = useCallback(
    (slide: HomeBanner) => {
      if (!slide.link_url) return;
      if (/^https?:\/\//i.test(slide.link_url)) {
        window.open(slide.link_url, "_blank", "noopener,noreferrer");
      } else {
        navigate(slide.link_url);
      }
    },
    [navigate],
  );

  if (loading && banners.length === 0) {
    return <div className="w-full bg-muted animate-pulse" style={{ minHeight: 168 }} aria-hidden />;
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label="Banner promosi"
      onTouchStart={(e) => {
        pausedRef.current = true;
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        pausedRef.current = false;
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        touchStartX.current = null;
        if (start == null || end == null || count < 2) return;
        const delta = end - start;
        if (Math.abs(delta) < 40) return;
        setIndex((i) => (delta < 0 ? (i + 1) % count : (i - 1 + count) % count));
      }}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={cn(
              "relative w-full shrink-0 grow-0 basis-full overflow-hidden",
              slide.link_url && "cursor-pointer",
            )}
            style={{ padding: "14px 16px 22px" }}
            role={slide.link_url ? "button" : undefined}
            tabIndex={slide.link_url ? 0 : undefined}
            onClick={() => handleSlideClick(slide)}
            onKeyDown={(e) => {
              if (slide.link_url && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                handleSlideClick(slide);
              }
            }}
            aria-hidden={i !== index}
          >
            <img
              src={slide.image_url}
              alt={slide.title ?? "Banner Bengkel Mobil Stroban"}
              width={1600}
              height={900}
              fetchPriority={i === 0 ? "high" : "low"}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div aria-hidden className="absolute inset-0" style={{ background: OVERLAY }} />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)" }}
            />
            <div className="relative z-10 text-primary-foreground pb-10 min-w-0" style={{ minHeight: 96 }}>
              {slide.show_text && (
                <>
                  <p className="font-sans text-primary text-xs font-semibold">
                    Solusi perawatan mobil anda
                  </p>
                  {slide.title && (
                    <h1 className="mt-1 font-sans text-2xl break-words text-white">{slide.title}</h1>
                  )}
                  {slide.subtitle && (
                    <p className="mt-1 font-sans text-sm font-bold text-primary break-words">
                      {slide.subtitle}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute bottom-2 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ke banner ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-primary" : "w-1.5 bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeBannerSlider;