import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Clock,
  Tag,
  ArrowRight,
  Info,
  Droplets,
  RotateCcw,
  ShieldCheck,
  Wrench,
  Zap,
  Wind,
  ThermometerSun,
  Car,
  Sparkles,
  Settings,
  Flame,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets, RotateCcw, ShieldCheck, Wrench, Zap, Wind,
  ThermometerSun, Car, Sparkles, Settings, Flame,
};

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
  icon: string;
  badge: string | null;
  is_active: boolean;
  sort_order: number;
  booking_service_id: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "Semua",
  maintenance: "Perawatan",
  tires: "Ban",
  electrical: "Kelistrikan",
  ac: "AC",
  body: "Body",
  engine: "Mesin",
  detailing: "Detailing",
};

// Category metadata for the (i) info popup — color theme + description per category
const CATEGORY_INFO: Record<
  string,
  { title: string; description: string; gradient: string; ring: string }
> = {
  maintenance: {
    title: "Perawatan Berkala",
    description:
      "Servis rutin untuk menjaga performa mobil tetap prima — meliputi ganti oli, filter, tune-up, dan inspeksi menyeluruh.",
    gradient: "from-sky-500/20 to-blue-500/10",
    ring: "ring-sky-500/30",
  },
  tires: {
    title: "Layanan Ban",
    description:
      "Pemasangan, spooring, balancing, dan rotasi ban untuk kenyamanan & keamanan berkendara harian.",
    gradient: "from-amber-500/20 to-orange-500/10",
    ring: "ring-amber-500/30",
  },
  electrical: {
    title: "Kelistrikan",
    description:
      "Diagnosa & perbaikan sistem kelistrikan: aki, dinamo, lampu, sensor, dan modul ECU.",
    gradient: "from-yellow-500/20 to-amber-500/10",
    ring: "ring-yellow-500/30",
  },
  ac: {
    title: "AC Mobil",
    description:
      "Servis AC lengkap: cek freon, bersihkan evaporator, ganti filter kabin, dan perbaikan kompresor.",
    gradient: "from-cyan-500/20 to-teal-500/10",
    ring: "ring-cyan-500/30",
  },
  body: {
    title: "Body & Eksterior",
    description:
      "Perbaikan body, cat ulang, poles, dan detailing eksterior agar mobil tampil seperti baru.",
    gradient: "from-fuchsia-500/20 to-pink-500/10",
    ring: "ring-fuchsia-500/30",
  },
  engine: {
    title: "Mesin",
    description:
      "Overhaul, tune-up, dan perbaikan mesin oleh teknisi berpengalaman dengan suku cadang berkualitas.",
    gradient: "from-red-500/20 to-rose-500/10",
    ring: "ring-red-500/30",
  },
  detailing: {
    title: "Detailing",
    description:
      "Salon mobil profesional: cuci premium, coating, interior deep clean, dan glass treatment.",
    gradient: "from-violet-500/20 to-purple-500/10",
    ring: "ring-violet-500/30",
  },
  default: {
    title: "Layanan Bengkel",
    description:
      "Layanan profesional dari Bengkel Stroban — ditangani teknisi berpengalaman.",
    gradient: "from-primary/20 to-primary/5",
    ring: "ring-primary/30",
  },
};

const getCategoryInfo = (cat: string) => CATEGORY_INFO[cat] ?? CATEGORY_INFO.default;

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const Katalog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ServiceRow | null>(null);

  useEffect(() => {
    document.title = "Katalog Layanan | Stroban";
    const meta =
      document.querySelector('meta[name="description"]') ||
      (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
    meta.setAttribute(
      "content",
      "Katalog layanan bengkel: telusuri, pilih, dan booking layanan favorit dengan cepat."
    );
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!error) setServices((data as ServiceRow[]) || []);
      setLoading(false);
    };
    fetchServices();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["all"]);
    services.forEach((s) => s.category && set.add(s.category));
    return Array.from(set);
  }, [services]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      const matchCat = activeCategory === "all" || s.category === activeCategory;
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false);
      return matchCat && matchSearch;
    });
  }, [services, activeCategory, search]);

  const handleBook = (s: ServiceRow) => {
    const id = s.booking_service_id || s.id;
    const path = `/booking?service=${encodeURIComponent(id)}`;
    if (!user) {
      openLoginDialog(path);
      return;
    }
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-6 lg:pt-10">
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Katalog Layanan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Telusuri layanan bengkel dan booking dengan satu ketukan.
          </p>

          {/* Search bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari layanan..."
              className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:shadow-[0_0_10px_hsl(var(--primary)/0.2)] transition-all"
              aria-label="Cari layanan"
            />
          </div>
        </header>

        {/* Category filter — horizontal scroll */}
        <nav
          className="-mx-4 px-4 mb-5 overflow-x-auto scrollbar-hide"
          aria-label="Kategori layanan"
        >
          <div className="flex gap-2 min-w-max">
            {categories.map((c) => {
              const active = activeCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {CATEGORY_LABELS[c] ??
                    c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Service grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Tidak ada layanan yang cocok.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
            {filtered.map((s) => {
              const Icon = ICON_MAP[s.icon] || Wrench;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="group relative flex flex-col items-center justify-center text-center bg-card border border-border rounded-2xl p-4 hover:border-primary hover:shadow-[0_0_14px_hsl(var(--primary)/0.3)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
                >
                  {s.badge && (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                      {s.badge}
                    </span>
                  )}
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                    {s.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (() => {
            const Icon = ICON_MAP[selected.icon] || Wrench;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <DialogTitle className="text-base">{selected.name}</DialogTitle>
                      <p className="text-xs text-muted-foreground capitalize">
                        {CATEGORY_LABELS[selected.category] ?? selected.category}
                      </p>
                    </div>
                  </div>
                  <DialogDescription className="text-sm text-muted-foreground text-left">
                    {selected.description || "Layanan profesional dari Bengkel Stroban."}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Durasi</p>
                      <p className="text-sm font-semibold text-foreground">{selected.duration} menit</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Harga</p>
                      <p className="text-sm font-semibold text-foreground">{formatIDR(selected.price)}</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleBook(selected)}
                  className="w-full mt-3 gap-2"
                  size="lg"
                >
                  Booking Sekarang <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Katalog;