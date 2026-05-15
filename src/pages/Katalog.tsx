import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Clock, ArrowRight, Info, Star, Tag } from "lucide-react";
import { Plus, Check } from "lucide-react";
import ServiceMediaSlideshow, {
  type MediaItem,
} from "@/components/catalog/ServiceMediaSlideshow";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
  rating: number;
  reviews: number;
  badge: string | null;
  icon: string;
  is_active: boolean;
  sort_order: number;
  booking_service_id: string | null;
  image_url: string | null;
  media_urls: MediaItem[] | null;
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

const formatIDR = (n: number) => {
  if (!n || n <= 0) return "FREE";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
};

const Katalog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const cart = useCart();

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [infoService, setInfoService] = useState<ServiceRow | null>(null);

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
      "Katalog layanan bengkel: telusuri, lihat foto & video paket layanan, dan booking dengan satu ketukan."
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
      if (!error) setServices((data as unknown as ServiceRow[]) || []);
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
    // Selalu pakai PK `services.id` agar cocok dengan lookup di form booking
    // (useBookingServices). `booking_service_id` adalah alias internal dan tidak
    // selalu sama dengan `id` di hook tersebut.
    // Tambahkan ke cart juga agar layanan ini ikut tersinkron.
    cart.addItem({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      category: s.category,
    });
    const path = `/booking?service=${encodeURIComponent(s.id)}&cart=1`;
    if (!user) {
      openLoginDialog(path);
      return;
    }
    navigate(path);
  };

  const handleAddToCart = (s: ServiceRow) => {
    if (cart.has(s.id)) {
      toast.info("Layanan sudah ada di pesanan");
      return;
    }
    cart.addItem({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      category: s.category,
    });
    toast.success(`${s.name} ditambahkan ke pesanan`, {
      action: { label: "Lihat", onClick: () => navigate("/booking?cart=1") },
      duration: 4000,
    });
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

        {/* Category filter */}
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

        {/* Service grid — slideshow card style */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Tidak ada layanan yang cocok.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
            {filtered.map((s, i) => (
              <article
                key={s.id}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_hsl(var(--primary)/0.15)] transition-all duration-300 animate-scale-in cursor-pointer"
                onClick={() => setInfoService(s)}
              >
                {/* Slideshow media */}
                <div className="relative w-full aspect-[4/3] bg-muted">
                  <ServiceMediaSlideshow
                    media={(s.media_urls as MediaItem[]) || []}
                    fallbackImage={s.image_url}
                    alt={s.name}
                    rounded=""
                  />

                  {/* Top-left badge */}
                  {s.badge && (
                    <Badge className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground text-[9px] uppercase tracking-wide shadow-md">
                      {s.badge}
                    </Badge>
                  )}

                  {/* Info Lebih Lengkap chip */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoService(s);
                    }}
                    aria-label={`Info lebih lengkap untuk ${s.name}`}
                    className="absolute top-2 right-2 z-20 inline-flex items-center justify-center h-7 w-7 rounded-full bg-background/90 backdrop-blur-sm border border-border text-primary shadow-md hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 transition-all"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>

                  {cart.has(s.id) && (
                    <Badge className="absolute bottom-2 left-2 z-20 bg-emerald-600 text-white text-[9px] uppercase tracking-wide shadow-md gap-1">
                      <Check className="h-2.5 w-2.5" />
                      Di pesanan
                    </Badge>
                  )}
                </div>

                {/* Body */}
                <div className="p-3 text-center">
                  <h3 className="text-sm font-bold text-primary line-clamp-1 leading-tight">
                    {s.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {CATEGORY_LABELS[s.category] ?? s.category}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {s.duration} Menit
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Detail dialog — center modal with zoom-in */}
      <Dialog open={!!infoService} onOpenChange={(o) => !o && setInfoService(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 animate-scale-in">
          {infoService && (
            <div className="flex flex-col max-h-[88vh]">
              {/* Media slideshow header */}
              <div className="relative w-full aspect-[16/10] bg-muted">
                <ServiceMediaSlideshow
                  media={(infoService.media_urls as MediaItem[]) || []}
                  fallbackImage={infoService.image_url}
                  alt={infoService.name}
                  rounded=""
                  intervalMs={4000}
                />
                {infoService.badge && (
                  <Badge className="absolute top-3 left-3 z-20 bg-primary text-primary-foreground text-[10px] uppercase tracking-wide shadow-md">
                    {infoService.badge}
                  </Badge>
                )}
              </div>

              <DialogHeader className="px-5 pt-4 pb-2 text-left space-y-1">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {infoService.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground capitalize">
                  Kategori{" "}
                  {CATEGORY_LABELS[infoService.category] ?? infoService.category}
                </DialogDescription>
              </DialogHeader>

              {/* Stats row */}
              <div className="px-5 pb-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-muted/50 border border-border/60 p-2.5 text-center">
                  <Tag className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Harga</p>
                  <p className="text-xs font-bold text-primary">
                    {formatIDR(infoService.price)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border/60 p-2.5 text-center">
                  <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Durasi</p>
                  <p className="text-xs font-bold text-foreground">
                    {infoService.duration} mnt
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border/60 p-2.5 text-center">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                  <p className="text-xs font-bold text-foreground">
                    {infoService.rating.toFixed(1)}
                    {infoService.reviews > 0 && (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {" "}
                        ({infoService.reviews})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Description */}
              {infoService.description && (
                <div className="px-5 pb-4 overflow-y-auto">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Deskripsi Layanan
                  </h4>
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                    {infoService.description}
                  </p>
                </div>
              )}

              {/* Sticky footer */}
              <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm p-4 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const svc = infoService;
                    handleAddToCart(svc);
                    setInfoService(null);
                  }}
                  size="lg"
                  disabled={cart.has(infoService.id)}
                  className="w-full sm:w-auto sm:flex-1 gap-2 min-w-0 sm:px-4"
                >
                  {cart.has(infoService.id) ? (
                    <>
                      <Check className="h-4 w-4" /> Sudah di Pesanan
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Tambah ke Pesanan
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    const svc = infoService;
                    setInfoService(null);
                    handleBook(svc);
                  }}
                  className="w-full sm:w-auto sm:flex-1 gap-2 min-w-0 sm:px-4"
                  size="lg"
                >
                  Booking Sekarang <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Katalog;