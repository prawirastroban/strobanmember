import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Disc3, Car } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Tire {
  id: string;
  brand: string;
  type: string;
  size: string;
  description: string | null;
  oem_compatibility: string[];
  image_url: string | null;
}

const TireCatalogSection = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tire | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchTires = async () => {
      const { data } = await supabase
        .from("tires")
        .select("id, brand, type, size, description, oem_compatibility, image_url")
        .eq("is_active", true)
        .order("brand");
      setTires((data as Tire[]) || []);
      setIsLoading(false);
    };
    fetchTires();
  }, []);

  const filtered = tires.filter(
    (t) =>
      t.brand.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase()) ||
      t.size.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="tire-catalog" className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-3">
            <Disc3 className="h-3.5 w-3.5 mr-1" />
            {t.tireCatalog?.navLabel || "Katalog Ban"}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            {t.tireCatalog?.title || "Katalog Ban"}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {t.tireCatalog?.subtitle || "Jelajahi koleksi ban kami"}
          </p>
        </div>

        <div className="relative mb-6 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.tireCatalog?.searchPlaceholder || "Cari berdasarkan merek, tipe, atau ukuran..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t.tireCatalog?.noResults || "Ban tidak ditemukan"}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((tire) => (
              <Card
                key={tire.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(tire)}
              >
                <CardContent className="p-0">
                  {tire.image_url ? (
                    <img
                      src={tire.image_url}
                      alt={`${tire.brand} ${tire.type}`}
                      className="w-full h-40 object-cover rounded-t-xl"
                    />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center rounded-t-xl">
                      <Disc3 className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-4 space-y-1">
                    <p className="font-semibold text-lg">{tire.brand}</p>
                    <p className="text-sm text-muted-foreground">{tire.type}</p>
                    <Badge variant="outline">{tire.size}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.brand} — {selected?.type}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.image_url ? (
                <img
                  src={selected.image_url}
                  alt={`${selected.brand} ${selected.type}`}
                  className="w-full h-56 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-56 bg-muted flex items-center justify-center rounded-lg">
                  <Disc3 className="h-16 w-16 text-muted-foreground/40" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{selected.brand}</Badge>
                  <Badge variant="secondary">{selected.type}</Badge>
                  <Badge variant="outline">{selected.size}</Badge>
                </div>
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}
                {selected.oem_compatibility && selected.oem_compatibility.length > 0 && (
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5 mb-1">
                      <Car className="h-4 w-4" />
                      {t.tireCatalog?.oemTitle || "Kompatibilitas OEM"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.oem_compatibility.map((car, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {car}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default TireCatalogSection;
