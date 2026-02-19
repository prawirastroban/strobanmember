import { ShieldCheck, Clock, Award, Users, Wrench, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const features = [
  { icon: Award, key: "certified" },
  { icon: Clock, key: "fast" },
  { icon: ShieldCheck, key: "quality" },
  { icon: Users, key: "trusted" },
  { icon: Wrench, key: "equipment" },
  { icon: ThumbsUp, key: "satisfaction" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
} as const;

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const } },
} as const;

const WhyChooseUs = () => {
  const { t } = useLanguage();
  const wcu = t.whyChooseUs;

  return (
    <section className="py-14 md:py-20 bg-background relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">
            {wcu?.label || "Why Choose Us"}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {wcu?.title || "The Stroban"}{" "}
            <span className="text-primary">{wcu?.titleHighlight || "Difference"}</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            {wcu?.subtitle || "We combine expertise, speed, and genuine care to keep your car in peak condition."}
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {features.map(({ icon: Icon, key }) => {
            const feature = wcu?.features?.[key as keyof typeof wcu.features];
            return (
              <motion.div
                key={key}
                variants={cardVariants}
                className="group flex gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-[var(--shadow-medium)] transition-all duration-300"
              >
                {/* Icon */}
                <div className="flex-shrink-0 p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors h-fit">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                {/* Text */}
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {feature?.title || key}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature?.desc || ""}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
