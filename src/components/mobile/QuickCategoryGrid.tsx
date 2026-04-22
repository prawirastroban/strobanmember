import { Wrench, Disc, Droplets, Wind, Zap, Sparkles, Car, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ITEMS = [
  { icon: Wrench, label: "Servis", color: "bg-blue-500/10 text-blue-600", path: "/booking" },
  { icon: Disc, label: "Ban", color: "bg-orange-500/10 text-orange-600", path: "/#tires" },
  { icon: Droplets, label: "Ganti Oli", color: "bg-emerald-500/10 text-emerald-600", path: "/booking" },
  { icon: Wind, label: "AC Mobil", color: "bg-cyan-500/10 text-cyan-600", path: "/booking" },
  { icon: Zap, label: "Aki & Listrik", color: "bg-yellow-500/10 text-yellow-600", path: "/booking" },
  { icon: Sparkles, label: "Detailing", color: "bg-purple-500/10 text-purple-600", path: "/booking" },
  { icon: Car, label: "Body Care", color: "bg-rose-500/10 text-rose-600", path: "/booking" },
  { icon: Tag, label: "Promo", color: "bg-red-500/10 text-red-600", path: "/#promo" },
];

const QuickCategoryGrid = () => {
  const navigate = useNavigate();
  return (
    <section className="lg:hidden -mt-6 px-3 relative z-10">
      <div className="bg-card border border-border rounded-2xl shadow-md p-3 grid grid-cols-4 gap-y-3">
        {ITEMS.map(({ icon: Icon, label, color, path }) => (
          <button
            key={label}
            onClick={() => {
              if (path.startsWith("/#")) {
                const el = document.getElementById(path.slice(2));
                el?.scrollIntoView({ behavior: "smooth" });
              } else navigate(path);
            }}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition"
          >
            <span className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-foreground leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickCategoryGrid;