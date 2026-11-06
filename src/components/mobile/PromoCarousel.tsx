import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import promoStormber from "@/assets/promo-stormber.png.asset.json";

type Slide = { image?: string; alt: string; title?: string; subtitle?: string; badge?: string; to: string };

const SLIDES: Slide[] = [
  { image: promoStormber.url, alt: "Promo Stormber: paket servis, cuci AC, tune up injector, promo ban", to: "/katalog" },
  { alt: "Servis kurang dari 1 jam", badge: "HEMAT WAKTU", title: "Servis < 1 Jam", subtitle: "Tanpa antri, langsung jalan", to: "/booking" },
  { alt: "Diskon ganti ban", badge: "PROMO", title: "Diskon Ganti Ban", subtitle: "Hingga 20% untuk member", to: "/katalog?category=tires" },
];

const PromoCarousel = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % SLIDES.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <section id="promo" aria-label="Promo" className="lg:hidden mt-4 rounded-t-[28px] border-t border-border/60 bg-card px-3 pt-4 pb-2 shadow-[0_-10px_24px_-18px_hsl(0_0%_0%/0.35),inset_0_1px_2px_hsl(0_0%_100%/0.6)]">
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-[14px] font-bold text-foreground">Promo Spesial</h2>
        <button onClick={() => navigate("/promo")} className="text-[12px] font-semibold text-primary min-h-[32px] px-1">Lihat semua</button>
      </div>
      <div ref={ref} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
        {SLIDES.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => navigate(s.to)}
            aria-label={s.alt}
            className="relative shrink-0 w-full snap-center overflow-hidden rounded-2xl text-left aspect-[326/187] active:scale-[0.99] transition-transform"
          >
            {s.image ? (
              <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="home-red-bg flex h-full w-full flex-col justify-center p-5 text-primary-foreground">
                <span className="self-start text-[10px] font-bold tracking-widest bg-primary-foreground/20 px-2 py-0.5 rounded mb-2">{s.badge}</span>
                <span className="text-[18px] font-bold leading-tight">{s.title}</span>
                <span className="text-[12px] opacity-90 mt-1">{s.subtitle}</span>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="flex justify-center" aria-label="Pilih slide promo">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Promo ${i + 1} dari ${SLIDES.length}`}
            aria-current={i === idx ? "true" : undefined}
            onClick={() => { const el = ref.current; if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" }); }}
            className="h-8 min-w-8 px-1 flex items-center justify-center"
          >
            <span className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </section>
  );
};

export default PromoCarousel;
