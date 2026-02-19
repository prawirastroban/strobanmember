import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const testimonials = [
  { name: "Budi Santoso", location: "Bandung", rating: 5, avatar: "BS", serviceKey: "oilChange", quoteKey: "quote1" },
  { name: "Dewi Rahayu", location: "Yogyakarta", rating: 5, avatar: "DR", serviceKey: "fullService", quoteKey: "quote2" },
  { name: "Rizky Pratama", location: "Cirebon", rating: 5, avatar: "RP", serviceKey: "acService", quoteKey: "quote3" },
  { name: "Siti Nurhaliza", location: "Tasikmalaya", rating: 4, avatar: "SN", serviceKey: "brakeInspection", quoteKey: "quote4" },
  { name: "Ahmad Fauzi", location: "Bandung", rating: 5, avatar: "AF", serviceKey: "tireRotation", quoteKey: "quote5" },
  { name: "Maya Indah", location: "Yogyakarta", rating: 5, avatar: "MI", serviceKey: "fullService", quoteKey: "quote6" },
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
        className={`h-4 w-4 ${star <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`}
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
    <section className="py-14 md:py-20 bg-secondary/30">
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
                <Star key={s} className="h-5 w-5 fill-accent text-accent" />
              ))}
            </div>
            <span className="text-foreground font-bold text-lg">4.9</span>
            <span className="text-muted-foreground text-sm">
              {ts?.basedOn || "based on 1,200+ reviews"}
            </span>
          </div>
        </motion.div>

        {/* Testimonial Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {testimonials.map((item, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              className="group relative bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-[var(--shadow-medium)] transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote className="h-7 w-7 text-primary/20 mb-3 group-hover:text-primary/40 transition-colors" />

              {/* Quote text */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">
                "{getQuote(item.quoteKey)}"
              </p>

              {/* Divider */}
              <div className="border-t border-border pt-4 flex items-center justify-between">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {item.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.location}</p>
                  </div>
                </div>

                {/* Rating + service */}
                <div className="text-right">
                  <StarRating rating={item.rating} />
                  <p className="text-xs text-muted-foreground mt-1">{getService(item.serviceKey)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
