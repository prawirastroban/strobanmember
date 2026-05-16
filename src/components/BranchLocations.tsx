import { useEffect, useState } from "react";
import { MapPin, Clock, Phone, MessageCircle, Navigation, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
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
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  image_url: string | null;
  directions_url: string | null;
}

const fallbackImage: Record<string, string> = {
  bandung: branchBandung,
  tasikmalaya: branchTasikmalaya,
  cirebon: branchCirebon,
  yogyakarta: branchYogyakarta,
};

const BranchLocations = () => {
  const { t } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("branches")
        .select("id, slug, name, address, phone, whatsapp, hours, image_url, directions_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!active) return;
      setBranches((data as Branch[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("branches-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branches" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!loading && branches.length === 0) return null;

  return (
    <section id="branches" className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">{t.branches.title}</h2>
          <p className="text-muted-foreground text-sm">{t.branches.subtitle}</p>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {branches.map((branch) => {
              const image = branch.image_url || fallbackImage[branch.slug] || branchBandung;
              return (
                <div
                  key={branch.id}
                  className="group bg-card rounded-lg overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={image}
                      alt={`${branch.name} branch`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm">{branch.name}</h3>
                    </div>
                    {branch.address && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {branch.address}
                      </p>
                    )}
                    {branch.hours && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        <span>{branch.hours}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      {branch.phone && (
                        <a
                          href={`tel:${branch.phone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                        >
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="text-primary font-medium hidden sm:inline">
                            {t.branches.call}
                          </span>
                        </a>
                      )}
                      {branch.whatsapp && (
                        <a
                          href={buildWhatsAppUrl({
                            phone: branch.whatsapp,
                            text: `Halo, saya ingin bertanya tentang layanan di cabang ${branch.name}`,
                          })}
                          onClick={(event) =>
                            handleWhatsAppNavigation(event, {
                              phone: branch.whatsapp!,
                              text: `Halo, saya ingin bertanya tentang layanan di cabang ${branch.name}`,
                            })
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-green-500/10 hover:bg-green-500/20 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-medium hidden sm:inline">
                            WhatsApp
                          </span>
                        </a>
                      )}
                    </div>
                    {branch.directions_url && (
                      <a
                        href={branch.directions_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-colors w-full"
                      >
                        <Navigation className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">
                          {t.branches.getDirections}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default BranchLocations;

  return (
    <section id="branches" className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">{t.branches.title}</h2>
          <p className="text-muted-foreground text-sm">
            {t.branches.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BRANCHES.map((branch) => (
            <div
              key={branch.id}
              className="group bg-card rounded-lg overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={branch.image}
                  alt={`${branch.name} branch`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="font-semibold text-sm">{branch.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {branch.address}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Clock className="h-3 w-3" />
                  <span>{branch.hours}</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <a
                    href={`tel:${branch.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="text-primary font-medium hidden sm:inline">{t.branches.call}</span>
                  </a>
                  <a
                    href={buildWhatsAppUrl({
                      phone: branch.whatsapp,
                      text: `Halo, saya ingin bertanya tentang layanan di cabang ${branch.name}`,
                    })}
                    onClick={(event) =>
                      handleWhatsAppNavigation(event, {
                        phone: branch.whatsapp,
                        text: `Halo, saya ingin bertanya tentang layanan di cabang ${branch.name}`,
                      })
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-green-500/10 hover:bg-green-500/20 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium hidden sm:inline">WhatsApp</span>
                  </a>
                </div>
                <a
                  href={branch.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-colors w-full"
                >
                  <Navigation className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">{t.branches.getDirections}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BranchLocations;
