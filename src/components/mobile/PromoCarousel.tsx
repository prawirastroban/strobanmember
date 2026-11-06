import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import promoStormber from "@/assets/promo-stormber.png";

type Slide = { image?: string; alt: string; title?: string; subtitle?: string; badge?: string; to: string };

const SLIDES: Slide[] = [
  { image: promoStormber, alt: "Promo Stormber: paket servis, cuci AC, tune up injector, promo ban", to: "/katalog" },
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
    <section id="promo" aria-label="Promo" className="lg:hidden relative mt-2 overflow-hidden rounded-t-[28px] border border-b-0 border-border/50 bg-card/40 px-3 pt-3 pb-2 backdrop-blur-2xl shadow-[0_-12px_30px_-18px_hsl(0_0%_0%/0.3),inset_0_2px_4px_hsl(0_0%_100%/0.5)]">
      <div aria-hidden className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-12 top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-background/10" />
      <div className="relative flex items-center justify-between px-1 mb-1.5">
        <h2 className="text-[14px] font-bold text-foreground">Promo Spesial</h2>
        <button onClick={() => navigate("/promo")} className="text-[12px] font-semibold text-primary min-h-[32px] px-1">Lihat semua</button>
      </div>
      <div ref={ref} onScroll={onScroll} className="relative flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-2xl">
        {SLIDES.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => navigate(s.to)}
            aria-label={s.alt}
            className="relative shrink-0 w-full snap-center overflow-hidden text-left aspect-[288/157] active:scale-[0.99] transition-transform"
          >
            {s.image ? (
              <img src={s.image} alt="" loading="eager" className="block h-full w-full object-cover" />
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
      <div className="relative flex justify-center" aria-label="Pilih slide promo">
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
