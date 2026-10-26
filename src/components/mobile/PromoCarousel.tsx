import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollHintRow } from "@/components/ui/scroll-hint-row";

const SLIDES = [
  { title: "Servis < 1 Jam", subtitle: "Tanpa antri, langsung jalan", cta: "Pesan Sekarang", gradient: "from-red-500 to-orange-500", badge: "HEMAT WAKTU" },
  { title: "Diskon Ganti Ban", subtitle: "Hingga 20% untuk member", cta: "Lihat Ban", gradient: "from-blue-500 to-cyan-500", badge: "PROMO" },
];

const PromoCarousel = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % SLIDES.length;
        ref.current?.scrollTo({ left: next * (ref.current.clientWidth || 0), behavior: "smooth" });
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const onScroll = () => {
    if (!ref.current) return;
    const w = ref.current.clientWidth;
    setIdx(Math.round(ref.current.scrollLeft / w));
  };

  return (
    <section id="promo" className="lg:hidden mt-5 px-3">
      <ScrollHintRow
        ref={ref}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 -mx-1 px-1"
      >
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className={`shrink-0 w-full snap-center rounded-2xl p-5 text-white bg-gradient-to-br ${s.gradient} shadow-lg`}
          >
            <span className="inline-block text-[11px] font-bold tracking-widest bg-white/20 backdrop-blur px-2 py-1 rounded mb-2">
              {s.badge}
            </span>
            <h3 className="text-xl font-bold leading-tight">{s.title}</h3>
            <p className="text-sm opacity-90 mt-1 mb-3">{s.subtitle}</p>
            <button
              onClick={() => navigate("/booking")}
              className="min-h-11 text-sm font-semibold bg-white text-foreground px-4 py-2 rounded-full active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {s.cta} →
            </button>
          </div>
        ))}
      </ScrollHintRow>
      <div className="flex justify-center mt-1" aria-label="Pilih slide promo">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Promo ${i + 1} dari ${SLIDES.length}`}
            aria-current={i === idx ? "true" : undefined}
            onClick={() => {
              const el = ref.current;
              if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
            }}
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