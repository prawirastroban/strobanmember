import { useEffect, useMemo, useRef, useState } from "react";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface RealReview {
  id: string;
  created_at: string;
  rating: number;
  review: string | null;
  service_name: string | null;
  branch: string | null;
  initials: string | null;
  display_name: string | null;
}

const easing = [0.4, 0, 0.2, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easing } },
} as const;

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easing } },
} as const;

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 transition-transform duration-200 hover:scale-125 ${
          star <= rating
            ? "fill-primary text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.5)]"
            : "text-primary/20"
        }`}
      />
    ))}
  </div>
);

const Testimonials = () => {
  const { t } = useLanguage();
  const ts = t.testimonials;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [realReviews, setRealReviews] = useState<RealReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real customer reviews from public_reviews view
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("public_reviews" as any)
        .select("id, created_at, rating, review, service_name, branch, initials, display_name")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!active) return;
      if (!error && data) setRealReviews(data as unknown as RealReview[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || paused) return;
    let raf = 0;
    let last = performance.now();
    const speed = 35; // px per second (vertical)
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Auto scroll vertical (ke bawah). Reset ke setengah saat mencapai
      // ujung agar loop mulus berkat list yang digandakan.
      const half = el.scrollHeight / 2;
      if (el.scrollTop >= half) {
        el.scrollTop -= half;
      } else {
        el.scrollTop += speed * dt;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  // Only show real verified customer reviews — no dummy data.
  const displayItems = useMemo(
    () =>
      realReviews
        .filter((r) => (r.review || "").trim().length > 0)
        .map((r) => ({
          key: `real-${r.id}`,
          name: r.display_name || "Pelanggan",
          avatar: (r.initials || "S").slice(0, 2),
          rating: r.rating || 5,
          date: formatShortDate(r.created_at),
          location: r.branch ? r.branch.charAt(0).toUpperCase() + r.branch.slice(1) : "",
          serviceLabel: r.service_name || "",
          quote: r.review || "",
          isReal: true,
        })),
    [realReviews],
  );

  // Gandakan list agar marquee vertikal terasa mulus tanpa "loncat".
  const loopItems = useMemo(() => [...displayItems, ...displayItems], [displayItems]);

  // Hide entire section while loading or when there are zero real reviews,
  // so the homepage never shows empty/dummy testimonial cards.
  if (loading || displayItems.length === 0) return null;

  return (
    <section className="py-4 md:py-10 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          className="text-center mb-4 md:mb-6"
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <p className="text-[10px] md:text-xs font-semibold tracking-widest uppercase text-primary mb-1 md:mb-2">
            {ts?.label || "Customer Reviews"}
          </p>
          <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            {ts?.title || "What Our Customers"}{" "}
            <span className="text-primary">{ts?.titleHighlight || "Say About Us"}</span>
          </h2>
          <p className="text-xs md:text-base text-muted-foreground mt-1 md:mt-2 max-w-lg mx-auto">
            {ts?.subtitle || "Trusted by thousands of car owners across our branches."}
          </p>

          {/* Aggregate rating */}
          <div className="flex items-center justify-center gap-2 md:gap-3 mt-3 md:mt-5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-4 w-4 md:h-5 md:w-5 fill-primary text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
              ))}
            </div>
            <span className="text-foreground font-bold text-base md:text-lg">4.9</span>
            <span className="text-muted-foreground text-xs md:text-sm">
              {ts?.basedOn || "based on 1,200+ reviews"}
            </span>
          </div>
        </motion.div>

        {/* Testimonial Cards - vertical auto scroll */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="relative max-w-2xl mx-auto"
        >
          {/* Fade gradient atas/bawah */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 md:h-12 bg-gradient-to-b from-background to-transparent z-10" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 md:h-12 bg-gradient-to-t from-background to-transparent z-10" />

          <div
            ref={scrollRef}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            className="flex flex-col gap-3 md:gap-4 overflow-y-auto h-[360px] md:h-[480px] py-2 md:py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {loopItems.map((item, idx) => (
              <motion.div
                key={`${item.key}-${idx}`}
                variants={cardVariants}
                className="group relative rounded-xl md:rounded-2xl p-3 md:p-4 border border-primary/15 bg-card/60 backdrop-blur-xl shadow-[0_8px_20px_hsl(0_0%_0%/0.08)] hover:border-primary/40 hover:shadow-[0_12px_32px_hsl(var(--primary)/0.15)] transition-all duration-300 flex-shrink-0 w-full"
              >
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <Quote className="h-5 w-5 md:h-7 md:w-7 text-primary/30 group-hover:text-primary/60 transition-colors" />
                  {item.isReal && (
                    <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-1.5 md:px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </div>

                <p className="text-[13px] md:text-sm text-foreground/80 leading-relaxed mb-3 md:mb-5 italic line-clamp-3 md:line-clamp-4">
                  "{item.quote}"
                </p>

                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <StarRating rating={item.rating} />
                  <span className="text-[11px] text-muted-foreground">{item.date}</span>
                </div>

                <div className="border-t border-primary/10 pt-3 md:pt-4 flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs md:text-sm flex-shrink-0">
                    {item.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-bold text-foreground leading-tight truncate">{item.name}</p>
                    {item.serviceLabel && (
                      <p className="text-xs text-muted-foreground truncate">{item.serviceLabel}</p>
                    )}
                    {item.location && (
                      <p className="text-[11px] text-muted-foreground/70 truncate">{item.location}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
