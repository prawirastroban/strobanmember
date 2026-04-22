import { useEffect, useMemo, useState } from "react";
import { Star, Clock, ChevronRight, Wrench, Info, ShoppingCart, CheckCircle2, Sparkles, ArrowRight, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  rating: number;
  badge: string | null;
  category: string;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const CATEGORY_TONE: Record<string, string> = {
  service: "from-primary/20 to-primary/5 text-primary",
  oli: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
  ban: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400",
  ac: "from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
  rem: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400",
};

const toneFor = (cat: string) => {
  const k = (cat || "").toLowerCase();
  return CATEGORY_TONE[k] ?? "from-primary/20 to-primary/5 text-primary";
};

const MobileServiceList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { addService, serviceItems } = useCart();
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Service | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id,name,description,price,duration,rating,badge,category")
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(6);
      setServices((data as Service[]) || []);
      setLoading(false);
    })();
  }, []);

  const openAll = async () => {
    setShowAll(true);
    if (allServices.length === 0) {
      setLoadingAll(true);
      const { data } = await supabase
        .from("services")
        .select("id,name,description,price,duration,rating,badge,category")
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("sort_order", { ascending: true });
      setAllServices((data as Service[]) || []);
      setLoadingAll(false);
    }
  };

  const inCart = (id: string) => serviceItems.some(x => x.service_id === id);

  const addToCart = (s: Service) => {
    if (!user) { openLoginDialog("/checkout"); return; }
    if (inCart(s.id)) {
      toast({ title: "Sudah di keranjang", description: s.name });
      return;
    }
    addService({
      service_id: s.id, name: s.name, category: s.category,
      duration: s.duration, unit_price: Number(s.price) || 0,
    });
    toast({ title: "Ditambahkan ke keranjang", description: s.name });
  };

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allServices;
    return allServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }, [allServices, query]);

  // Compact Apple-style card — used in horizontal grid (homepage)
  const ServiceCard = ({ s }: { s: Service }) => {
    const added = inCart(s.id);
    return (
      <div className="group relative bg-card border border-border rounded-2xl p-2.5 hover:border-primary/40 transition shadow-sm">
        {s.badge && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[8px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-tight">
            {s.badge}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setDetail(s); }}
          className="absolute top-1.5 right-1.5 z-10 h-6 w-6 inline-flex items-center justify-center rounded-full bg-background/70 backdrop-blur text-muted-foreground hover:text-primary active:scale-90 transition"
          aria-label={`Detail ${s.name}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>

        <div className={`h-14 rounded-xl bg-gradient-to-br ${toneFor(s.category)} flex items-center justify-center mb-2`}>
          <Wrench className="h-6 w-6" />
        </div>

        <h3 className="font-semibold text-[13px] text-foreground line-clamp-1 leading-tight">{s.name}</h3>

        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
          {s.rating}
          <span className="opacity-50">•</span>
          <Clock className="h-2.5 w-2.5" />
          {s.duration}m
        </div>

        <div className="flex items-center justify-between gap-1.5 mt-1.5">
          <p className="text-[12px] font-bold text-primary truncate">{formatIDR(s.price)}</p>
          <button
            onClick={() => addToCart(s)}
            disabled={added}
            className={`shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full active:scale-90 transition shadow-sm ${
              added
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
            aria-label={added ? "Sudah di keranjang" : "Tambah ke keranjang"}
          >
            {added ? <CheckCircle2 className="h-4 w-4" /> : <ShoppingCart className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    );
  };

  // List card — used inside the "All services" dialog
  const ServiceRow = ({ s }: { s: Service }) => {
    const added = inCart(s.id);
    return (
      <div className="group relative w-full p-2.5 bg-card border border-border rounded-2xl hover:border-primary/40 transition">
        <div className="flex gap-2.5">
          <div className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br flex items-center justify-center ${toneFor(s.category)}`}>
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[13px] text-foreground line-clamp-1">{s.name}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setDetail(s); }}
                className="shrink-0 h-6 w-6 -m-0.5 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-90 transition"
                aria-label={`Detail ${s.name}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />{s.rating}
              <span className="opacity-50">•</span>
              <Clock className="h-2.5 w-2.5" />{s.duration} mnt
              {s.badge && (<><span className="opacity-50">•</span><span className="text-primary font-semibold">{s.badge}</span></>)}
            </div>
            <div className="flex items-end justify-between mt-1 gap-2">
              <p className="text-[12px] font-bold text-primary truncate">{formatIDR(s.price)}</p>
              <button
                onClick={() => addToCart(s)}
                disabled={added}
                className={`text-[10px] font-semibold px-2 py-1 rounded-lg active:scale-95 transition inline-flex items-center gap-1 shrink-0 ${
                  added ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {added ? (<><CheckCircle2 className="h-3 w-3" />Ditambah</>) : (<><ShoppingCart className="h-3 w-3" />Tambah</>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="lg:hidden mt-5 px-4">
        <div className="flex items-end justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-bold text-foreground tracking-tight">Layanan Pilihan</h2>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              <Sparkles className="h-2.5 w-2.5" /> POPULER
            </span>
          </div>
          <button
            onClick={openAll}
            className="text-xs font-semibold text-primary flex items-center gap-0.5 active:scale-95 transition"
          >
            Semua <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-2.5">
                  <Skeleton className="h-14 w-full rounded-xl mb-2" />
                  <Skeleton className="h-3 w-3/4 mb-1" />
                  <Skeleton className="h-2.5 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))
            : services.map((s) => <ServiceCard key={s.id} s={s} />)}
        </div>
      </section>

      {/* Detail Pop-up */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-2xl border-border">
          {detail && (
            <>
              <div className={`relative bg-gradient-to-br ${toneFor(detail.category)} px-5 pt-6 pb-5`}>
                <div className="h-14 w-14 rounded-2xl bg-background/70 backdrop-blur flex items-center justify-center shadow-sm">
                  <Wrench className="h-7 w-7" />
                </div>
                {detail.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {detail.badge}
                  </span>
                )}
                <DialogHeader className="mt-3 text-left space-y-1">
                  <DialogTitle className="text-lg font-bold">{detail.name}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground capitalize">
                    Kategori: {detail.category}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-5 pt-4 pb-2 space-y-4">
                {detail.description && (
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {detail.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> Durasi
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{detail.duration} mnt</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Star className="h-3 w-3" /> Rating
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{detail.rating}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Sparkles className="h-3 w-3" /> Harga
                    </div>
                    <p className="text-sm font-semibold mt-0.5 text-primary">{formatIDR(detail.price)}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-5 pb-5 pt-2 flex-col gap-2 sm:flex-col sm:space-x-0">
                <Button
                  onClick={() => { addToCart(detail); setDetail(null); }}
                  disabled={inCart(detail.id)}
                  className="w-full"
                >
                  {inCart(detail.id) ? (
                    <><CheckCircle2 className="h-4 w-4" /> Sudah di keranjang</>
                  ) : (
                    <><ShoppingCart className="h-4 w-4" /> Tambah ke Keranjang</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDetail(null);
                    if (user) navigate("/checkout"); else openLoginDialog("/checkout");
                  }}
                  className="w-full"
                >
                  Lihat Keranjang <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* All services Pop-up */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-border max-h-[85vh] flex flex-col">
          <DialogHeader className="px-5 pt-5 pb-3 text-left">
            <DialogTitle className="text-lg font-bold">Semua Layanan</DialogTitle>
            <DialogDescription className="text-xs">
              Pilih layanan, tambahkan ke keranjang dan checkout sekaligus.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari layanan..."
                className="pl-9 pr-9 h-10 rounded-xl"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Bersihkan"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5">
            {loadingAll ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 bg-card border border-border rounded-2xl">
                  <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))
            ) : filteredAll.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Tidak ada layanan yang cocok.
              </p>
            ) : (
              filteredAll.map((s) => <ServiceCard key={s.id} s={s} />)
            )}
          </div>

          {serviceItems.length > 0 && (
            <div className="border-t border-border p-4 bg-card/80 backdrop-blur">
              <Button
                onClick={() => {
                  setShowAll(false);
                  if (user) navigate("/checkout"); else openLoginDialog("/checkout");
                }}
                className="w-full"
              >
                <ShoppingCart className="h-4 w-4" />
                Lanjut ke Keranjang ({serviceItems.length})
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileServiceList;
