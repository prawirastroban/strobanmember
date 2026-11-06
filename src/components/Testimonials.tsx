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
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] md:text-2xl font-semibold tracking-tight text-foreground">Ulasan Pelanggan</h2>
          <span className="text-[12px] text-muted-foreground">Ulasan terverifikasi</span>
        </div>

        <div className="relative overflow-hidden rounded-[22px] border border-border/60 bg-card/70 backdrop-blur-2xl shadow-[0_20px_50px_-20px_hsl(0_0%_0%/0.18),inset_0_2px_4px_hsl(0_0%_100%/0.5)]">
          <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 p-4 border-b border-border/60">
            <div>
              <p className="text-[34px] font-bold leading-none tabular-nums text-foreground">4.9</p>
              <div className="mt-2 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-foreground text-foreground" />
                ))}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">1.200+ ulasan</p>
            </div>
            <div className="flex flex-col gap-1.5 pt-1 text-[12px] text-muted-foreground tabular-nums">
              {[{ s: 5, p: 92 }, { s: 4, p: 6 }, { s: 3, p: 2 }].map((r) => (
                <div key={r.s} className="flex items-center gap-2">
                  <span className="w-6 text-right">{r.s}★</span>
                  <span className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-muted-foreground/60" style={{ width: `${r.p}%` }} />
                  </span>
                  <span className="w-8 text-right">{r.p}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-card to-transparent z-10" />
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-card to-transparent z-10" />
            <div
              ref={scrollRef}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={() => setPaused(true)}
              onTouchEnd={() => setPaused(false)}
              className="flex flex-col overflow-y-auto h-[300px] md:h-[380px] divide-y divide-border/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {loopItems.map((item, idx) => (
                <div key={`${item.key}-${idx}`} className="flex-shrink-0 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-muted flex items-center justify-center text-[12px] font-semibold text-muted-foreground">
                      {item.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-[12px] text-muted-foreground truncate">
                            {[item.serviceLabel, item.location].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {item.isReal && (
                          <span className="shrink-0 rounded-md bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-[14px] italic leading-relaxed text-foreground/75 line-clamp-3">"{item.quote}"</p>
                  <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                    {item.date} · {"★".repeat(Math.round(item.rating || 5))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
