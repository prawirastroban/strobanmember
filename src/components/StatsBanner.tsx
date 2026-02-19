import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Users, MapPin, Award, ThumbsUp } from "lucide-react";

interface Stat {
  icon: React.ElementType;
  target: number;
  suffix: string;
  prefix?: string;
  labelKey: "customers" | "branches" | "years" | "satisfaction";
}

const stats: Stat[] = [
  { icon: Users,    target: 10000, suffix: "+", labelKey: "customers"    },
  { icon: MapPin,   target: 4,     suffix: "",  labelKey: "branches"     },
  { icon: Award,    target: 8,     suffix: "+", labelKey: "years"        },
  { icon: ThumbsUp, target: 98,    suffix: "%", labelKey: "satisfaction" },
];

function useCounter(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);

  return count;
}

function StatCard({ stat, index, active }: { stat: Stat; index: number; active: boolean }) {
  const { t } = useLanguage();
  const Icon = stat.icon;
  const count = useCounter(stat.target, 1400 + index * 200, active);

  const label = t.stats[stat.labelKey];

  const formatted =
    stat.target >= 1000
      ? count.toLocaleString("id-ID")
      : count.toString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center gap-3 px-6 py-6 md:py-0 relative group"
    >
      {/* Divider between items (hidden on last) */}
      {index < stats.length - 1 && (
        <span className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-12 w-px bg-primary/20" />
      )}

      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-6 w-6 text-primary" />
      </div>

      <div className="text-center">
        <p className="text-4xl md:text-5xl font-extrabold text-foreground leading-none tracking-tight">
          {stat.prefix}
          {formatted}
          <span className="text-primary">{stat.suffix}</span>
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground font-medium">{label}</p>
      </div>
    </motion.div>
  );
}

const StatsBanner = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="bg-card border-y border-border"
    >
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 divide-y md:divide-y-0 divide-border">
          {stats.map((stat, i) => (
            <StatCard key={stat.labelKey} stat={stat} index={i} active={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBanner;
