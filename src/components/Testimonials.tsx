import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const testimonials = [
  { name: "Budi Santoso", location: "Bandung", vehicle: "Toyota Avanza 2019", date: "12 Apr 2026", rating: 5, avatar: "BS", serviceKey: "oilChange", quoteKey: "quote1" },
  { name: "Dewi Rahayu", location: "Yogyakarta", vehicle: "Honda Brio 2021", date: "08 Apr 2026", rating: 5, avatar: "DR", serviceKey: "fullService", quoteKey: "quote2" },
  { name: "Rizky Pratama", location: "Cirebon", vehicle: "Mitsubishi Xpander 2020", date: "02 Apr 2026", rating: 5, avatar: "RP", serviceKey: "acService", quoteKey: "quote3" },
  { name: "Siti Nurhaliza", location: "Tasikmalaya", vehicle: "Daihatsu Sigra 2022", date: "28 Mar 2026", rating: 4, avatar: "SN", serviceKey: "brakeInspection", quoteKey: "quote4" },
  { name: "Ahmad Fauzi", location: "Bandung", vehicle: "Suzuki Ertiga 2018", date: "20 Mar 2026", rating: 5, avatar: "AF", serviceKey: "tireRotation", quoteKey: "quote5" },
  { name: "Maya Indah", location: "Yogyakarta", vehicle: "Toyota Innova 2020", date: "15 Mar 2026", rating: 5, avatar: "MI", serviceKey: "fullService", quoteKey: "quote6" },
  { name: "Andi Wijaya", location: "Bandung", vehicle: "Honda HR-V 2022", date: "10 Mar 2026", rating: 5, avatar: "AW", serviceKey: "oilChange", quoteKey: "quote1" },
  { name: "Linda Kusuma", location: "Cirebon", vehicle: "Toyota Rush 2021", date: "05 Mar 2026", rating: 5, avatar: "LK", serviceKey: "acService", quoteKey: "quote3" },
  { name: "Rangga Saputra", location: "Tasikmalaya", vehicle: "Daihatsu Terios 2019", date: "28 Feb 2026", rating: 4, avatar: "RS", serviceKey: "brakeInspection", quoteKey: "quote4" },
  { name: "Putri Anjani", location: "Yogyakarta", vehicle: "Suzuki XL7 2023", date: "22 Feb 2026", rating: 5, avatar: "PA", serviceKey: "tireRotation", quoteKey: "quote5" },
  { name: "Hendra Gunawan", location: "Bandung", vehicle: "Toyota Fortuner 2020", date: "15 Feb 2026", rating: 5, avatar: "HG", serviceKey: "fullService", quoteKey: "quote2" },
  { name: "Nadia Safira", location: "Cirebon", vehicle: "Honda Mobilio 2018", date: "10 Feb 2026", rating: 5, avatar: "NS", serviceKey: "oilChange", quoteKey: "quote1" },
];

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

  const getQuote = (key: string) => ts?.[key as keyof typeof ts] || "";

  const getService = (key: string) => {
    const map: Record<string, string> = {
      oilChange: t.booking.oilChange,
      fullService: t.booking.fullService,
      brakeInspection: t.booking.brakeInspection,
      tireRotation: t.booking.tireRotation,
      acService: t.catalog?.acService || "AC Service",
    };
    return map[key] || key;
  };

  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">
            {ts?.label || "Customer Reviews"}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {ts?.title || "What Our Customers"}{" "}
            <span className="text-primary">{ts?.titleHighlight || "Say About Us"}</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            {ts?.subtitle || "Trusted by thousands of car owners across our branches."}
          </p>

          {/* Aggregate rating */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-5 w-5 fill-primary text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
              ))}
            </div>
            <span className="text-foreground font-bold text-lg">4.9</span>
            <span className="text-muted-foreground text-sm">
              {ts?.basedOn || "based on 1,200+ reviews"}
            </span>
          </div>
        </motion.div>

        {/* Testimonial Cards - horizontal scroll */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="-mx-4 px-4"
        >
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {testimonials.map((item, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="group relative rounded-2xl p-4 border border-primary/15 bg-card/60 backdrop-blur-xl shadow-[0_8px_20px_hsl(0_0%_0%/0.08)] hover:scale-[1.02] hover:border-primary/40 hover:shadow-[0_12px_32px_hsl(var(--primary)/0.15)] transition-all duration-300 snap-start flex-shrink-0 w-[78%] sm:w-[280px]"
              >
                <Quote className="h-7 w-7 text-primary/30 mb-3 group-hover:text-primary/60 transition-colors" />

                <p className="text-sm text-foreground/80 leading-relaxed mb-5 italic line-clamp-4">
                  "{getQuote(item.quoteKey)}"
                </p>

                <div className="flex items-center justify-between mb-4">
                  <StarRating rating={item.rating} />
                  <span className="text-[11px] text-muted-foreground">{item.date}</span>
                </div>

                <div className="border-t border-primary/10 pt-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {item.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground leading-tight truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.vehicle}</p>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{getService(item.serviceKey)} • {item.location}</p>
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
