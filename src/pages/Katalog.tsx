import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollHintRow, ScrollHintColumn } from "@/components/ui/scroll-hint-row";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Search, Clock, ArrowRight, Info, Star, Tag, ShoppingCart, Car, ShieldCheck, MessageCircle } from "lucide-react";
import { Plus, Check } from "lucide-react";
import ServiceMediaSlideshow, {
  type MediaItem,
} from "@/components/catalog/ServiceMediaSlideshow";
import TireSmartSearch from "@/components/catalog/TireSmartSearch";
import TireResultCard, { type CatalogTire } from "@/components/catalog/TireResultCard";
import { matchTire, parseTireQuery, parseTireSize } from "@/lib/tireSearch";
import { openWhatsApp } from "@/lib/whatsapp";
import { useCart } from "@/contexts/CartContext";
import { useCartDialog } from "@/contexts/CartDialogContext";
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
  vehicle_criteria: string | null;
  warranty_info: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "Semua",
  maintenance: "Servis",
  tires: "Ban",
  electrical: "Kelistrikan",
  ac: "AC",
  body: "Body",
  engine: "Mesin",
  detailing: "Detailing",
  "paket-ganti-oli": "Oli",
  "promo-spesial": "Promo",
  "tune-up": "Tune Up",
  spooring: "Spooring",
  pengecekan: "Pengecekan",
  "ban-luar": "Ban Luar",
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const cart = useCart();
  const { openCart } = useCartDialog();

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [infoService, setInfoService] = useState<ServiceRow | null>(null);

  // Mode ban: pencarian pintar merk / ukuran / rim
  const isTireMode = activeCategory === "tires";
  const [tires, setTires] = useState<CatalogTire[]>([]);
  const [tiresLoading, setTiresLoading] = useState(false);
  const [tireBrand, setTireBrand] = useState<string | null>(null);
  const [tireRim, setTireRim] = useState<number | null>(null);
  const [tireDetail, setTireDetail] = useState<CatalogTire | null>(null);

  useEffect(() => {
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

  // Lazy-load data ban hanya saat kategori Ban aktif
  useEffect(() => {
    if (!isTireMode || tires.length > 0 || tiresLoading) return;
    const fetchTires = async () => {
      setTiresLoading(true);
      const { data, error } = await supabase
        .from("tires")
        .select(
          "id, brand, type, size, category, description, oem_compatibility, image_url, logo_url, click_count"
        )
        .eq("is_active", true)
        .order("click_count", { ascending: false })
        .order("brand", { ascending: true });
      if (!error && data) {
        setTires(
          data.map((row) => ({
            id: row.id,
            brand: row.brand ?? "Unknown",
            type: row.type ?? "Tire",
            size: row.size ?? "-",
            category: row.category ?? "Passenger",
            description: row.description ?? null,
            oem_compatibility: Array.isArray(row.oem_compatibility)
              ? (row.oem_compatibility as string[]).filter(Boolean)
              : [],
            image_url: row.image_url ?? null,
            logo_url: row.logo_url ?? null,
          }))
        );
      }
      setTiresLoading(false);
    };
    fetchTires();
  }, [isTireMode, tires.length, tiresLoading]);

  const categories = useMemo(() => {
    const set = new Set<string>(["all"]);
    services.forEach((s) => s.category && set.add(s.category));
    return Array.from(set);
  }, [services]);

  // Sinkron filter kategori dengan URL (?category=...).
  // Dipakai oleh deep-link dari tile Layanan di home.
  useEffect(() => {
    const param = searchParams.get("category");
    if (!param) {
      if (activeCategory !== "all") setActiveCategory("all");
      return;
    }
    if (param === activeCategory) return;
    if (param === "all" || categories.includes(param)) {
      setActiveCategory(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, categories]);

  const handleCategoryChange = (c: string) => {
    setActiveCategory(c);
    if (c !== "tires") {
      setTireBrand(null);
      setTireRim(null);
    }
    const next = new URLSearchParams(searchParams);
    if (c === "all") next.delete("category");
    else next.set("category", c);
    setSearchParams(next, { replace: true });
  };

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

  // Hasil produk ban dengan parsing ukuran + chip merk/rim
  const tireResults = useMemo(() => {
    if (!isTireMode) return [];
    const parsed = parseTireQuery(search);
    return tires.filter((t) => {
      if (tireBrand && t.brand !== tireBrand) return false;
      if (tireRim !== null && parseTireSize(t.size).rim !== tireRim) return false;
      return matchTire(t, parsed);
    });
  }, [isTireMode, tires, search, tireBrand, tireRim]);

  // Di mode ban, layanan juga dicocokkan lewat kata kunci hasil parsing
  const tireServices = useMemo(() => {
    if (!isTireMode) return filtered;
    const parsed = parseTireQuery(search);
    if (parsed.terms.length === 0 && !parsed.rim && !parsed.width) return filtered;
    return services.filter((s) => {
      if (s.category !== "tires") return false;
      const hay = `${s.name} ${s.description ?? ""}`.toLowerCase();
      const termOk =
        parsed.terms.length === 0 || parsed.terms.some((t) => hay.includes(t));
      const sizeOk =
        (parsed.rim === null || hay.includes(String(parsed.rim))) &&
        (parsed.width === null || hay.includes(String(parsed.width)));
      return termOk && sizeOk;
    });
  }, [isTireMode, filtered, services, search]);

  const visibleServices = isTireMode ? tireServices : filtered;

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
    if (!cart.has(s.id)) {
      cart.addItem({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        category: s.category,
      });
    }
    // Alur: pilih layanan → popup keranjang → booking/checkout
    openCart();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-6 lg:pt-10">
        {/* Header */}
        <header className="mb-5">
          {/* Search bar — adaptif: mode ban punya perilaku pintar */}
          {isTireMode ? (
            <TireSmartSearch
              value={search}
              onChange={setSearch}
              tires={tires}
              activeBrand={tireBrand}
              onBrandToggle={(b) => setTireBrand((prev) => (prev === b ? null : b))}
              activeRim={tireRim}
              onRimToggle={(r) => setTireRim((prev) => (prev === r ? null : r))}
            />
          ) : (
            <div className="relative">
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
          )}
        </header>

        {/* Category filter */}
        <ScrollHintRow
          wrapperClassName="-mx-4 mb-5"
          className="px-4 overflow-x-auto scrollbar-hide"
          aria-label="Kategori layanan"
        >
          <div className="flex gap-2 min-w-max">
            {categories.map((c) => {
              const active = activeCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => handleCategoryChange(c)}
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
        </ScrollHintRow>

        {/* Service grid — slideshow card style */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : visibleServices.length === 0 && tireResults.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {isTireMode
              ? "Tidak ada ban atau layanan yang cocok. Coba merk atau ukuran lain."
              : "Tidak ada layanan yang cocok."}
          </div>
        ) : (
          <>
          {visibleServices.length > 0 && (
          <>
          {isTireMode && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Layanan Ban
            </h2>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in">
            {visibleServices.map((s, i) => {
              const inCart = cart.has(s.id);
              return (
                <article
                  key={s.id}
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  className="group relative flex items-stretch gap-3 bg-card border border-border rounded-2xl overflow-hidden p-2.5 hover:border-primary/60 hover:shadow-[0_8px_24px_hsl(var(--primary)/0.15)] transition-all duration-300 animate-scale-in cursor-pointer"
                  onClick={() => setInfoService(s)}
                >
                  {/* Media block */}
                  <div className="relative w-24 sm:w-28 shrink-0 self-stretch min-h-[104px] rounded-xl overflow-hidden bg-primary">
                    <ServiceMediaSlideshow
                      media={(s.media_urls as MediaItem[]) || []}
                      fallbackImage={s.image_url}
                      alt={s.name}
                      rounded=""
                    />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {s.badge && (
                          <Badge className="mb-1 bg-primary text-primary-foreground text-[9px] uppercase tracking-wide">
                            {s.badge}
                          </Badge>
                        )}
                        <h3 className="text-[15px] font-extrabold text-primary leading-tight line-clamp-2">
                          {s.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoService(s);
                        }}
                        aria-label={`Info lebih lengkap untuk ${s.name}`}
                        className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full border border-border text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {s.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {s.description}
                      </p>
                    )}

                    {/* Kriteria kendaraan & garansi */}
                    {(s.vehicle_criteria || s.warranty_info) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.vehicle_criteria && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 max-w-full">
                            <Car className="h-3 w-3 shrink-0" />
                            <span className="truncate">{s.vehicle_criteria}</span>
                          </span>
                        )}
                        {s.warranty_info && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 max-w-full">
                            <ShieldCheck className="h-3 w-3 shrink-0" />
                            <span className="truncate">{s.warranty_info}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-lg font-extrabold text-foreground leading-none truncate">
                          {formatIDR(s.price)}
                        </p>
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {s.duration} Menit
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(s);
                        }}
                        aria-label={
                          inCart
                            ? `${s.name} sudah di pesanan`
                            : `Tambahkan ${s.name} ke pesanan`
                        }
                        className={`shrink-0 h-10 w-10 rounded-xl inline-flex items-center justify-center shadow-sm active:scale-95 transition-all ${
                          inCart
                            ? "bg-emerald-600 text-white"
                            : "bg-primary text-primary-foreground hover:brightness-110"
                        }`}
                      >
                        {inCart ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <ShoppingCart className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          </>
          )}

          {isTireMode && tireResults.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Produk Ban ({tireResults.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in">
                {tireResults.map((t) => (
                  <TireResultCard key={t.id} tire={t} onOpen={setTireDetail} />
                ))}
              </div>
            </section>
          )}

          {isTireMode && tiresLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          )}
          </>
        )}
      </main>

      {/* Detail sheet — bottom sheet with rounded top */}
      <Sheet open={!!infoService} onOpenChange={(o) => !o && setInfoService(null)}>
        <SheetContent side="bottom" className="w-full sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 p-0 overflow-hidden gap-0 rounded-t-3xl">
          {infoService && (
            <div className="flex flex-col h-full max-h-full overflow-y-auto">
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

              <SheetHeader className="px-5 pt-4 pb-2 text-left space-y-1">
                <SheetTitle className="text-lg font-bold text-foreground">
                  {infoService.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground capitalize">
                  Kategori{" "}
                  {CATEGORY_LABELS[infoService.category] ?? infoService.category}
                </SheetDescription>
              </SheetHeader>

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

              {/* Kriteria & garansi */}
              {(infoService.vehicle_criteria || infoService.warranty_info) && (
                <div className="px-5 pb-3 space-y-2">
                  {infoService.vehicle_criteria && (
                    <div className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border/60 p-2.5">
                      <Car className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Cocok untuk</p>
                        <p className="text-xs font-medium text-foreground">
                          {infoService.vehicle_criteria}
                        </p>
                      </div>
                    </div>
                  )}
                  {infoService.warranty_info && (
                    <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/20 p-2.5">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Garansi</p>
                        <p className="text-xs font-medium text-foreground">
                          {infoService.warranty_info}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {infoService.description && (
                <div className="px-5 pb-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Deskripsi Layanan
                  </h4>
                  <ScrollHintColumn
                    className="max-h-[180px] overflow-y-auto pr-1"
                    wrapperClassName="rounded-lg"
                  >
                    <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                      {infoService.description}
                    </p>
                  </ScrollHintColumn>
                </div>
              )}

              {/* Sticky footer */}
              <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm p-3 flex flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const svc = infoService;
                    handleAddToCart(svc);
                    setInfoService(null);
                  }}
                  disabled={cart.has(infoService.id)}
                  className="flex-1 h-10 gap-1.5 rounded-full text-xs font-semibold min-w-0 px-3"
                >
                  {cart.has(infoService.id) ? (
                    <>
                      <Check className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Ditambahkan</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Tambah</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    const svc = infoService;
                    setInfoService(null);
                    handleBook(svc);
                  }}
                  className="flex-1 h-10 gap-1.5 rounded-full text-xs font-semibold min-w-0 px-3"
                >
                  <span className="truncate">Booking</span> <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail ban */}
      <Dialog open={!!tireDetail} onOpenChange={(o) => !o && setTireDetail(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 animate-scale-in">
          {tireDetail && (
            <div className="flex flex-col max-h-[88vh]">
              <div className="relative w-full aspect-[16/10] bg-muted">
                <img
                  src={tireDetail.image_url || "/placeholder.svg"}
                  alt={`Ban ${tireDetail.brand} ${tireDetail.type} ${tireDetail.size}`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              <DialogHeader className="px-5 pt-4 pb-2 text-left space-y-1">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {tireDetail.brand} — {tireDetail.type}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Detail ban, ukuran, dan kompatibilitas kendaraan.
                </DialogDescription>
              </DialogHeader>

              <div className="px-5 pb-3 flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {tireDetail.brand}
                </Badge>
                <Badge variant="secondary">{tireDetail.category}</Badge>
                <Badge variant="outline" className="font-mono border-primary/30 text-primary">
                  {tireDetail.size}
                </Badge>
              </div>

              {tireDetail.description && (
                <div className="px-5 pb-3">
                  <ScrollHintColumn
                    className="max-h-[160px] overflow-y-auto pr-1"
                    wrapperClassName="rounded-lg"
                  >
                    <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                      {tireDetail.description}
                    </p>
                  </ScrollHintColumn>
                </div>
              )}

              {tireDetail.oem_compatibility.length > 0 && (
                <div className="px-5 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-primary" /> Kompatibilitas OEM
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tireDetail.oem_compatibility.map((car, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] border-border/60">
                        {car}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm p-4">
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={() =>
                    openWhatsApp({
                      phone: "628973700800",
                      text: `Halo, saya mau tanya stok ban ${tireDetail.brand} ${tireDetail.type} ukuran ${tireDetail.size}.`,
                    })
                  }
                >
                  <MessageCircle className="h-4 w-4" /> Konsultasi & Cek Stok
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