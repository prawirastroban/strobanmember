import { useEffect, useState } from "react";
import { Star, Clock, ChevronRight, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

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

const MobileServiceList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { addService, serviceItems } = useCart();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

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

  const book = (id?: string) => {
    const path = id ? `/booking?service=${encodeURIComponent(id)}` : "/booking";
    if (user) navigate(path);
    else openLoginDialog(path);
  };

  const addToCart = (s: Service) => {
    if (!user) { openLoginDialog("/checkout"); return; }
    if (serviceItems.some(x => x.service_id === s.id)) {
      toast({ title: "Sudah di keranjang", description: s.name });
      return;
    }
    addService({
      service_id: s.id, name: s.name, category: s.category,
      duration: s.duration, unit_price: Number(s.price) || 0,
    });
    toast({ title: "Ditambahkan", description: s.name });
  };

  return (
    <section className="lg:hidden mt-6 px-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Layanan Populer</h2>
          <p className="text-xs text-muted-foreground">Booking cepat, harga transparan</p>
        </div>
        <button
          onClick={() => book()}
          className="text-xs font-semibold text-primary flex items-center gap-0.5"
        >
          Lihat semua <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2.5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 bg-card border border-border rounded-2xl">
                <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))
          : services.map((s) => (
              <button
                key={s.id}
                onClick={() => book(s.id)}
                className="w-full flex gap-3 p-3 bg-card border border-border rounded-2xl active:scale-[0.99] hover:border-primary/40 transition text-left"
              >
                <div className="h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Wrench className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">{s.name}</h3>
                    {s.badge && (
                      <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded shrink-0">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {s.rating}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {s.duration} mnt
                    </span>
                  </div>
                  <div className="flex items-end justify-between mt-1.5">
                    <p className="text-sm font-bold text-primary">{formatIDR(s.price)}</p>
                    <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                      Pesan
                    </span>
                  </div>
                </div>
              </button>
            ))}
      </div>
    </section>
  );
};

export default MobileServiceList;