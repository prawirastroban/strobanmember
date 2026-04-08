import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Disc3, Car, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Tire {
  id: string;
  brand: string;
  type: string;
  size: string;
  category: string;
  description: string | null;
  oem_compatibility: string[];
  image_url: string | null;
  logo_url: string | null;
}

const CATEGORIES = ["All", "Passenger", "SUV", "Commercial"];

const TireCatalogSection = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selected, setSelected] = useState<Tire | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchTires = async () => {
      const { data } = await supabase
        .from("tires")
        .select("id, brand, type, size, category, description, oem_compatibility, image_url, logo_url")
        .eq("is_active", true)
        .order("brand");
      setTires((data as Tire[]) || []);
      setIsLoading(false);
    };
    fetchTires();
  }, []);

  const brands = useMemo(() => [...new Set(tires.map((t) => t.brand))].sort(), [tires]);
  const sizes = useMemo(() => [...new Set(tires.map((t) => t.size))].sort(), [tires]);

  const filtered = useMemo(() => {
    return tires.filter((tire) => {
      const matchSearch =
        !search ||
        tire.brand.toLowerCase().includes(search.toLowerCase()) ||
        tire.type.toLowerCase().includes(search.toLowerCase()) ||
        tire.size.toLowerCase().includes(search.toLowerCase());
      const matchBrand = brandFilter === "all" || tire.brand === brandFilter;
      const matchSize = sizeFilter === "all" || tire.size === sizeFilter;
      const matchCategory = categoryFilter === "All" || tire.category === categoryFilter;
      return matchSearch && matchBrand && matchSize && matchCategory;
    });
  }, [tires, search, brandFilter, sizeFilter, categoryFilter]);

  const hasActiveFilters = search || brandFilter !== "all" || sizeFilter !== "all" || categoryFilter !== "All";

  const resetFilters = () => {
    setSearch("");
    setBrandFilter("all");
    setSizeFilter("all");
    setCategoryFilter("All");
  };

  const handleCardClick = (tire: Tire) => {
    setClickedId(tire.id);
    setTimeout(() => {
      setSelected(tire);
      setClickedId(null);
    }, 200);
  };

  return (
    <section id="tire-catalog" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Disc3 className="h-4 w-4" />
            {t.tireCatalog?.navLabel || "Katalog Ban"}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
            {t.tireCatalog?.title || "Katalog Ban"}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t.tireCatalog?.subtitle || "Jelajahi koleksi ban premium kami dari merek terpercaya"}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="sticky top-16 z-30 -mx-4 px-4 py-4 mb-8 backdrop-blur-xl bg-background/70 border-b border-border/50">
          <div className="flex flex-col md:flex-row gap-3 max-w-5xl mx-auto">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.tireCatalog?.searchPlaceholder || "Cari merek, tipe, atau ukuran..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/60 backdrop-blur-sm border-border/50"
              />
            </div>

            {/* Brand */}
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-background/60 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="Merek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Merek</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Size */}
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-full md:w-[160px] bg-background/60 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="Ukuran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Ukuran</SelectItem>
                {sizes.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    categoryFilter === cat
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="shrink-0">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center gap-2 max-w-5xl mx-auto mt-3">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {filtered.length} produk ditemukan
            </span>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              {t.tireCatalog?.noResults || "Ban tidak ditemukan"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((tire) => (
              <div
                key={tire.id}
                onClick={() => handleCardClick(tire)}
                className={cn(
                  "group relative cursor-pointer rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md",
                  "shadow-sm hover:shadow-xl transition-all duration-300 ease-out",
                  "hover:scale-[1.03] hover:-translate-y-1",
                  clickedId === tire.id && "ring-2 ring-[#ff2b2b] shadow-[0_0_20px_rgba(255,43,43,0.3)]"
                )}
                style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
              >
                {/* Brand Logo Badge */}
                {tire.logo_url && (
                  <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm">
                    <img src={tire.logo_url} alt={tire.brand} className="h-5 w-auto object-contain" loading="lazy" />
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs font-medium">
                    {tire.category}
                  </Badge>
                </div>

                {/* Image */}
                <img
                  src={tire.image_url || "https://otomax.store/cdn/shop/articles/istockphoto-809822380-612x612.jpg?v=1730430682"}
                  alt={`${tire.brand} ${tire.type}`}
                  className="w-full h-48 object-cover rounded-t-2xl"
                  loading="lazy"
                />

                {/* Content */}
                <div className="p-5 space-y-2">
                  <h3 className="font-semibold text-lg leading-tight">{tire.brand}</h3>
                  <p className="text-sm text-muted-foreground">{tire.type}</p>
                  <Badge variant="outline" className="mt-1 font-mono text-xs">
                    {tire.size}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-border/50 bg-card/95 backdrop-blur-2xl">
          <div className="relative">
            <img
              src={selected?.image_url || "https://otomax.store/cdn/shop/articles/istockphoto-809822380-612x612.jpg?v=1730430682"}
              alt={`${selected?.brand} ${selected?.type}`}
              className="w-full h-64 object-cover"
            />
            {selected?.logo_url && (
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg">
                <img src={selected.logo_url} alt={selected.brand} className="h-6 w-auto object-contain" />
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <DialogHeader className="space-y-1 p-0">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {selected?.type}
              </DialogTitle>
              <p className="text-muted-foreground">{selected?.brand}</p>
            </DialogHeader>

            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                {selected?.brand}
              </Badge>
              <Badge variant="secondary">{selected?.category}</Badge>
              <Badge variant="outline" className="font-mono">{selected?.size}</Badge>
            </div>

            {selected?.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
            )}

            {selected?.oem_compatibility && selected.oem_compatibility.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Car className="h-4 w-4 text-primary" />
                  {t.tireCatalog?.oemTitle || "Kompatibilitas OEM"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.oem_compatibility.map((car, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-muted/50">
                      {car}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default TireCatalogSection;
