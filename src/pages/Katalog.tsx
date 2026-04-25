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
  const [infoCategory, setInfoCategory] = useState<string | null>(null);

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
            {filtered.map((s, i) => {
              const Icon = ICON_MAP[s.icon] || Wrench;
              const info = getCategoryInfo(s.category);
              return (
                <div
                  key={s.id}
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  className="group relative animate-scale-in"
                >
                  {/* Hover glow halo */}
                  <div
                    aria-hidden
                    className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-br ${info.gradient} opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500 pointer-events-none`}
                  />

                  <button
                    onClick={() => setSelected(s)}
                    className={`relative w-full h-full flex flex-col items-center justify-center text-center bg-card border border-border rounded-2xl p-4 pt-5 overflow-hidden hover:border-primary/60 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 ring-1 ring-transparent hover:${info.ring}`}
                  >
                    {/* Soft category-tinted background */}
                    <div
                      aria-hidden
                      className={`absolute inset-0 bg-gradient-to-br ${info.gradient} opacity-40 group-hover:opacity-80 transition-opacity duration-500 pointer-events-none`}
                    />
                    {/* Decorative blob */}
                    <div
                      aria-hidden
                      className={`absolute -top-8 -left-8 h-20 w-20 rounded-full bg-gradient-to-br ${info.gradient} blur-2xl opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-700 pointer-events-none`}
                    />

                    {s.badge && (
                      <span className="absolute top-2 left-2 z-10 text-[9px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                        {s.badge}
                      </span>
                    )}

                    <div className="relative z-10 h-14 w-14 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:rotate-[-4deg] transition-transform duration-300 shadow-sm">
                      <Icon className="h-7 w-7 text-primary group-hover:animate-pulse" />
                    </div>
                    <p className="relative z-10 text-xs lg:text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                      {s.name}
                    </p>
                    <p className="relative z-10 mt-1 text-[10px] text-muted-foreground capitalize">
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </p>
                  </button>

                  {/* Info button — top right */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoCategory(s.category);
                    }}
                    aria-label={`Info kategori ${CATEGORY_LABELS[s.category] ?? s.category}`}
                    className="absolute top-1.5 right-1.5 z-20 h-7 w-7 rounded-full bg-background/90 backdrop-blur-sm border border-border text-muted-foreground hover:text-primary hover:border-primary hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
          {selected && (() => {
            const info = getCategoryInfo(selected.category);
            const label = CATEGORY_LABELS[selected.category] ?? selected.category;
            const sameCategory = services.filter((s) => s.category === selected.category);
            return (
              <div className="flex flex-col max-h-[85vh]">
                {/* Header — mirror catalog category styling */}
                <DialogHeader className={`relative bg-gradient-to-br ${info.gradient} p-5 pb-4 text-left space-y-0`}>
                  <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
                  <div className="relative flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-sm">
                      <Tag className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-base">{info.title}</DialogTitle>
                      <DialogDescription className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        Kategori {label} • {sameCategory.length} layanan
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Catalog-style grid inside popup */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {sameCategory.map((s) => {
                      const ItemIcon = ICON_MAP[s.icon] || Wrench;
                      const active = selected.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelected(s)}
                          className={`group relative flex flex-col items-center justify-center text-center rounded-2xl p-3 overflow-hidden transition-all duration-300 active:scale-[0.97] ${
                            active
                              ? "bg-primary/10 border-2 border-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
                              : "bg-card border border-border hover:border-primary/60 hover:-translate-y-0.5"
                          }`}
                        >
                          <div
                            aria-hidden
                            className={`absolute inset-0 bg-gradient-to-br ${info.gradient} ${active ? "opacity-60" : "opacity-30 group-hover:opacity-60"} transition-opacity duration-500 pointer-events-none`}
                          />
                          {s.badge && (
                            <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                              {s.badge}
                            </span>
                          )}
                          <div className={`relative z-10 h-11 w-11 rounded-2xl flex items-center justify-center mb-1.5 border shadow-sm transition-transform duration-300 ${
                            active
                              ? "bg-primary/20 border-primary/40 scale-110"
                              : "bg-card/80 backdrop-blur-sm border-border/60 group-hover:scale-110"
                          }`}>
                            <ItemIcon className={`h-5 w-5 ${active ? "text-primary" : "text-primary"}`} />
                          </div>
                          <p className="relative z-10 text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">
                            {s.name}
                          </p>
                          <p className="relative z-10 mt-0.5 text-[10px] font-semibold text-primary">
                            {formatIDR(s.price)}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected service quick info */}
                  <div className="mt-4 bg-muted/40 border border-border rounded-2xl p-3 animate-fade-in">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Dipilih</p>
                    <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                    {selected.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selected.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" /> {selected.duration} menit
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Tag className="h-3.5 w-3.5 text-primary" /> {formatIDR(selected.price)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sticky footer — Selesai */}
                <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm p-4">
                  <Button
                    onClick={() => handleBook(selected)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    Selesai • Booking {selected.name} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Category info dialog */}
      <Dialog open={!!infoCategory} onOpenChange={(o) => !o && setInfoCategory(null)}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          {infoCategory && (() => {
            const info = getCategoryInfo(infoCategory);
            const label = CATEGORY_LABELS[infoCategory] ?? infoCategory;
            const count = services.filter((s) => s.category === infoCategory).length;
            return (
              <div className="relative">
                <div className={`relative bg-gradient-to-br ${info.gradient} p-6 pb-5`}>
                  <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-sm">
                      <Info className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <DialogTitle className="text-base">{info.title}</DialogTitle>
                      <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        Kategori {label} • {count} layanan
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 pt-4">
                  <DialogDescription className="text-sm text-foreground/80 leading-relaxed text-left">
                    {info.description}
                  </DialogDescription>
                  <Button
                    onClick={() => {
                      setActiveCategory(infoCategory);
                      setInfoCategory(null);
                    }}
                    variant="outline"
                    className="w-full mt-4 gap-2"
                  >
                    Lihat semua di {label} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Katalog;