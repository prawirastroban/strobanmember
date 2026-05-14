import { useEffect, useState } from "react";
import { MapPin, Phone, MessageCircle, Navigation, Clock, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import branchBandung from "@/assets/branch-bandung.jpg";
import branchTasikmalaya from "@/assets/branch-tasikmalaya.jpg";
import branchCirebon from "@/assets/branch-cirebon.jpg";
import branchYogyakarta from "@/assets/branch-yogyakarta.jpg";
import { buildWhatsAppUrl, handleWhatsAppNavigation } from "@/lib/whatsapp";

interface Branch {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  image_url: string | null;
  directions_url: string | null;
}

const fallbackImage: Record<string, string> = {
  bandung: branchBandung,
  tasikmalaya: branchTasikmalaya,
  cirebon: branchCirebon,
  yogyakarta: branchYogyakarta,
};

const Cabang = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Cabang Kami | Stroban";
    (async () => {
      const { data } = await (supabase as any)
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setBranches((data as Branch[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container mx-auto px-4 pt-4 lg:pt-10 max-w-5xl">
        <div className="mb-5 lg:mb-8">
          <h1 className="text-3xl font-bold mb-1">Cabang Kami</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Memuat cabang…" : `${branches.length} cabang siap melayani — pilih yang terdekat dengan Anda.`}
          </p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : branches.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Belum ada cabang aktif</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {branches.map((b) => {
              const image = b.image_url || fallbackImage[b.slug] || branchBandung;
              return (
                <article
                  key={b.id}
                  className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={image}
                      alt={b.name}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base flex items-center gap-1.5 mb-1">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      {b.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">{b.address}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      <span>{b.hours}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {b.phone && (
                        <a
                          href={`tel:${b.phone}`}
                          aria-label={`Telepon ${b.name}`}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium transition"
                        >
                          <Phone className="h-4 w-4" />
                          Telepon
                        </a>
                      )}
                      {b.whatsapp && (
                        <a
                          href={buildWhatsAppUrl({ phone: b.whatsapp, text: `Halo ${b.name}` })}
                          onClick={(event) => handleWhatsAppNavigation(event, { phone: b.whatsapp, text: `Halo ${b.name}` })}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${b.name}`}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 text-[11px] font-medium transition"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      )}
                      {b.directions_url && (
                        <a
                          href={b.directions_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Petunjuk arah ke ${b.name}`}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 text-[11px] font-medium transition"
                        >
                          <Navigation className="h-4 w-4" />
                          Arah
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cabang;
