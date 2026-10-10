import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Upload, Disc3, Droplet, Cog, Wrench, X, CarFront } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { matchesQuery, type PricelistItem } from "@/lib/pricelistSearch";
import { PricelistImportDialog } from "@/components/pricelist/PricelistImportDialog";
import { cn } from "@/lib/utils";

type FilterKey = "brand" | "type" | "pattern" | "rim";
type Filters = Record<FilterKey, string[]>;
const EMPTY: Filters = { brand: [], type: [], pattern: [], rim: [] };
const PAGE = 40;
const rp = (n: number | null) => (n == null ? "-" : `Rp ${Number(n).toLocaleString("id-ID")}`);

const greeting = () => {
  const h = new Date().getHours();
  return h < 11 ? "Selamat Pagi" : h < 15 ? "Selamat Siang" : h < 18 ? "Selamat Sore" : "Selamat Malam";
};

const CATEGORIES = [
  { id: "ban", label: "Ban", icon: Disc3 },
  { id: "oli", label: "Oli", icon: Droplet },
  { id: "sparepart", label: "Spareparts", icon: Cog },
  { id: "jasa", label: "Jasa", icon: Wrench },
];

const fieldOf = (it: PricelistItem, k: FilterKey) => (k === "rim" ? (it.rim != null ? String(it.rim) : "") : (it[k] ?? "")).toString();

function FilterPanel({ items, filters, setFilters }: { items: PricelistItem[]; filters: Filters; setFilters: (f: Filters) => void }) {
  const groups: { key: FilterKey; label: string }[] = [
    { key: "brand", label: "Brand" }, { key: "type", label: "Type" }, { key: "pattern", label: "Pattern" }, { key: "rim", label: "Rim" },
  ];
  const toggle = (k: FilterKey, v: string) => {
    const cur = filters[k];
    setFilters({ ...filters, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  return (
    <div className="space-y-5">
      {groups.map(({ key, label }) => {
        // counts reflect other active filters
        const base = items.filter((it) => (Object.keys(filters) as FilterKey[]).every((k) => k === key || !filters[k].length || filters[k].includes(fieldOf(it, k))));
        const counts = new Map<string, number>();
        base.forEach((it) => { const v = fieldOf(it, key); if (v) counts.set(v, (counts.get(v) ?? 0) + 1); });
        const opts = [...counts.entries()].sort((a, b) => key === "rim" ? Number(a[0]) - Number(b[0]) : a[0].localeCompare(b[0]));
        return (
          <div key={key}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="h-4 w-1 rounded bg-primary" />{label}</div>
            <div className={cn("flex flex-wrap gap-1.5", key === "pattern" && "max-h-48 overflow-auto pr-1")}>
              {opts.map(([v, c]) => {
                const on = filters[key].includes(v);
                return (
                  <button key={v} onClick={() => toggle(key, v)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 hover:bg-muted")}>
                    {key === "rim" ? `R${v}` : v} <span className="opacity-60">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="w-full" onClick={() => setFilters(EMPTY)}>Reset filter</Button>
    </div>
  );
}

const PricelistPage = () => {
  const { user } = useAuth();
  const { isStaff, isAdmin } = useUserRole();
  const canImport = isStaff || isAdmin;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [limit, setLimit] = useState(PAGE);
  const [importOpen, setImportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [soon, setSoon] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["pricelist-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle()).data,
  });
  const name = profile?.full_name || (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Tim";

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pricelist", "ban"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const all: PricelistItem[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("pricelist_items").select("*").eq("category", "ban")
          .order("brand").order("rim").order("price_retail").range(from, from + 999);
        if (error) throw error;
        all.push(...(data as PricelistItem[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const filtered = useMemo(() => items.filter((it) =>
    (Object.keys(filters) as FilterKey[]).every((k) => !filters[k].length || filters[k].includes(fieldOf(it, k))) && matchesQuery(it, q),
  ), [items, filters, q]);

  const lastUpdate = items.reduce((m, it) => (it.updated_at && it.updated_at > m ? it.updated_at : m), "");
  const activeCount = Object.values(filters).reduce((n, a) => n + a.length, 0);

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />
      <div className="container mx-auto max-w-7xl px-4 pt-6 lg:pt-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <section className="rounded-3xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl lg:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold lg:text-3xl">{greeting()}, <span className="font-bold">{name}</span></h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {items.length.toLocaleString("id-ID")} item ban
                  {lastUpdate && ` · update terakhir ${new Date(lastUpdate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}
                </p>
              </div>
              <div className="flex gap-2 lg:w-[380px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Cari ukuran, brand, mobil… (1856514)"
                    className="rounded-full pl-9 pr-8" aria-label="Cari pricelist" />
                  {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Hapus pencarian"><X className="h-4 w-4 text-muted-foreground" /></button>}
                </div>
                <Button variant="outline" size="icon" className="relative rounded-full lg:hidden" onClick={() => setFilterOpen(true)} aria-label="Filter">
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeCount}</span>}
                </Button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-foreground/95 p-4 text-background">
              <div>
                <div className="font-semibold">Pricelist Ban</div>
                <div className="text-xs opacity-70">{filtered.length.toLocaleString("id-ID")} hasil · Grosir, External, HEB, Retail</div>
              </div>
              {canImport && (
                <Button onClick={() => setImportOpen(true)} className="rounded-full shadow-lg"><Upload className="h-4 w-4" /> Import Excel</Button>
              )}
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Memuat pricelist…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {items.length === 0 ? "Belum ada data. Import file Excel untuk mengisi pricelist." : "Tidak ada ban yang cocok dengan pencarian/filter."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.slice(0, limit).map((it) => (
                  <div key={it.id} className="rounded-2xl border border-border/60 bg-background/80 p-3.5 lg:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">{it.brand} · {it.pattern}</div>
                        <div className="text-base font-bold">{it.size}</div>
                      </div>
                      <div className="flex gap-1">
                        {it.type && <Badge variant="secondary" className="text-[10px]">{it.type}</Badge>}
                        {it.rim != null && <Badge variant="outline" className="text-[10px]">R{it.rim}</Badge>}
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {([["Grosir", it.price_grosir], ["External", it.price_external], ["HEB", it.price_heb], ["Retail", it.price_retail]] as const).map(([l, v]) => (
                        <div key={l} className={cn("rounded-lg px-2.5 py-1.5", l === "Retail" ? "bg-primary/10" : "bg-muted/50")}>
                          <div className="text-[10px] text-muted-foreground">{l}</div>
                          <div className={cn("text-sm font-semibold", l === "Retail" && "text-primary")}>{rp(v)}</div>
                        </div>
                      ))}
                    </div>
                    {it.vehicle_model && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><CarFront className="mt-0.5 h-3.5 w-3.5 shrink-0" />{it.vehicle_model}</div>
                    )}
                  </div>
                ))}
                {limit < filtered.length && (
                  <Button variant="ghost" className="w-full" onClick={() => setLimit((l) => l + PAGE)}>
                    Tampilkan lagi ({(filtered.length - limit).toLocaleString("id-ID")} tersisa)
                  </Button>
                )}
              </div>
            )}
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-auto rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4" /> Filter</div>
              <FilterPanel items={items} filters={filters} setFilters={(f) => { setFilters(f); setLimit(PAGE); }} />
            </div>
          </aside>
        </div>
      </div>

      <nav className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-xl backdrop-blur-xl lg:bottom-6">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => id !== "ban" && setSoon(label)}
            className={cn("flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
              id === "ban" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted")}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </nav>
      {soon && (
        <div className="fixed bottom-36 left-1/2 z-40 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs text-background lg:bottom-20" onAnimationEnd={() => setSoon(null)}>
          Pricelist {soon} segera hadir
          <button className="ml-2 underline" onClick={() => setSoon(null)}>OK</button>
        </div>
      )}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-auto rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>Filter Ban</SheetTitle></SheetHeader>
          <div className="mt-4"><FilterPanel items={items} filters={filters} setFilters={(f) => { setFilters(f); setLimit(PAGE); }} /></div>
        </SheetContent>
      </Sheet>

      <PricelistImportDialog open={importOpen} onOpenChange={setImportOpen} current={items}
        onDone={() => qc.invalidateQueries({ queryKey: ["pricelist", "ban"] })} />
    </div>
  );
};

export default PricelistPage;
