import { useNavigate } from "react-router-dom";
import {
  Disc3, Layers, GaugeCircle, Droplets, Wrench, CloudRain, CircleDot, MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

type Category = {
  key: string;
  label: string;
  icon: LucideIcon;
  bg: string;
  color: string;
};

const CATEGORIES: Category[] = [
  { key: "ganti-ban",   label: "Ganti Ban",     icon: Disc3,           bg: "#fff5f5", color: "#E53935" },
  { key: "spooring",    label: "Spooring",      icon: Layers,          bg: "#fff8f0", color: "#F57C00" },
  { key: "balancing",   label: "Balancing",     icon: GaugeCircle,     bg: "#f0f8ff", color: "#1565C0" },
  { key: "ganti-oli",   label: "Ganti Oli",     icon: Droplets,        bg: "#f0fff4", color: "#2E7D32" },
  { key: "tune-up",     label: "Tune Up",       icon: Wrench,          bg: "#fdf0ff", color: "#7B1FA2" },
  { key: "cuci-mobil",  label: "Cuci Mobil",    icon: CloudRain,       bg: "#e8f5fe", color: "#0288D1" },
  { key: "rem-kampas",  label: "Rem & Kampas",  icon: CircleDot,       bg: "#fff3e0", color: "#E65100" },
  { key: "lainnya",     label: "Lainnya",       icon: MoreHorizontal,  bg: "#f5f5f5", color: "#8e8e93" },
];

const ServiceCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section
      className="lg:hidden"
      style={{ maxWidth: "100%", boxSizing: "border-box" }}
    >
      <div className="flex items-center justify-between" style={{ padding: "16px 16px 8px" }}>
        <h2
          className="text-foreground"
          style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Layanan
        </h2>
        <button
          onClick={() => navigate("/katalog")}
          style={{ fontSize: 12, color: "#E53935", fontWeight: 600, minHeight: 32, padding: "0 4px" }}
          aria-label="Lihat semua layanan"
        >
          Lihat semua
        </button>
      </div>

      <div
        className="grid grid-cols-4"
        style={{ gap: 8, padding: "0 16px", maxWidth: "100%", boxSizing: "border-box" }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() =>
                cat.key === "lainnya"
                  ? navigate("/katalog")
                  : navigate(`/booking?service=${cat.key}`)
              }
              className="flex flex-col items-center justify-start active:scale-[0.96] transition-transform"
              style={{ gap: 5, minHeight: 76 }}
              aria-label={cat.label}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: cat.bg,
                }}
              >
                <Icon style={{ width: 22, height: 22, color: cat.color }} strokeWidth={2} />
              </span>
              <span
                className="text-center"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.2,
                }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ServiceCategoryGrid;
