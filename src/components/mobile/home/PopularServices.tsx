import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Droplets, Wind, Disc, Zap, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";

type Service = {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  icon: string | null;
};

const ICONS: Record<string, typeof Wrench> = {
  oil: Droplets, ac: Wind, tire: Disc, electric: Zap, detail: Sparkles, default: Wrench,
};

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const pickIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("oli")) return ICONS.oil;
  if (n.includes("ac")) return ICONS.ac;
  if (n.includes("ban") || n.includes("tire") || n.includes("rotation")) return ICONS.tire;
  if (n.includes("aki") || n.includes("listrik")) return ICONS.electric;
  if (n.includes("detail") || n.includes("cuci")) return ICONS.detail;
  return ICONS.default;
};

const PopularServices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [items, setItems] = useState<Service[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id,name,category,price,duration,icon,is_popular,sort_order")
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(6);
      if (active && data) setItems(data as unknown as Service[]);
    })();
    return () => { active = false; };
  }, []);

  const go = (id: string) => {
    if (!user) { openLoginDialog(`/booking?service=${id}`); return; }
    navigate(`/booking?service=${id}`);
  };

  return (
    <section className="lg:hidden mt-8 px-4">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Layanan Populer</h2>
        <button
          onClick={() => user ? navigate("/booking") : openLoginDialog("/booking")}
          className="text-xs font-semibold text-primary flex items-center gap-0.5"
        >
          Semua <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map((s) => {
          const Icon = pickIcon(s.name);
          return (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className="text-left bg-card border border-border rounded-2xl p-3 active:scale-[0.98] transition"
            >
              <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground line-clamp-1">{s.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.duration} menit</p>
              <p className="text-sm font-bold text-primary mt-1">{formatIDR(s.price)}</p>
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="col-span-2 text-sm text-muted-foreground py-6 text-center">Memuat layanan…</p>
        )}
      </div>
    </section>
  );
};

export default PopularServices;