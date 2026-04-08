import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, CircleDot, Car } from "lucide-react";
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

const TireCatalog = () => {
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
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <CircleDot className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t.tireCatalog?.title || "Tire Catalog"}</h1>
          </div>
          <p className="text-muted-foreground">
            {t.tireCatalog?.subtitle || "Browse our available tire collection"}
          </p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.tireCatalog?.searchPlaceholder || "Search by brand, type, or size..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t.tireCatalog?.noResults || "No tires found"}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <CircleDot className="h-12 w-12 text-muted-foreground/40" />
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
      </main>

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
                  <CircleDot className="h-16 w-16 text-muted-foreground/40" />
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
                      {t.tireCatalog?.oemTitle || "OEM Compatibility"}
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
      <Footer />
    </div>
  );
};

export default TireCatalog;
