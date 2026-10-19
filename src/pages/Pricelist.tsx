import { useEffect, useMemo, useRef, useState } from "react";
import { usePricelistMemory } from "@/hooks/usePricelistMemory";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Upload, Disc3, Droplet, Cog, Wrench, X, CarFront, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOLONGAN_COLUMNS, GOLONGAN_ROWS, UKURAN_COLUMNS, UKURAN_ROWS } from "@/lib/golonganKendaraan";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { matchesQuery, type PricelistItem } from "@/lib/pricelistSearch";
import { PricelistImportDialog } from "@/components/pricelist/PricelistImportDialog";
import { PricelistItemName } from "@/components/pricelist/PricelistItemName";
import { cn } from "@/lib/utils";

type FilterKey = "brand" | "type" | "pattern" | "rim" | "unit" | "kategori";
type Cat = "ban" | "oli" | "sparepart" | "jasa" | "jasa_ban";
const isJasa = (c: Cat) => c === "jasa" || c === "jasa_ban";
const gridCols = (c: Cat) => (c === "oli" ? "grid-cols-2" : c === "sparepart" || c === "jasa_ban" ? "grid-cols-3" : "grid-cols-4");
type Filters = Record<FilterKey, string[]>;
const EMPTY: Filters = { brand: [], type: [], pattern: [], rim: [], unit: [], kategori: [] };
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

const getPriceColumns = (category: Cat, it: PricelistItem): ReadonlyArray<readonly [string, number | null]> =>
  category === "jasa_ban"
    ? [["Small", it.price_gol_a], ["Medium", it.price_gol_b], ["Large", it.price_gol_c]]
    : category === "jasa"
    ? [["Gol A", it.price_gol_a], ["Gol B", it.price_gol_b], ["Gol C", it.price_gol_c], ["Gol D", it.price_gol_d]]
    : category === "sparepart"
      ? [["External", it.price_external], ["HEB", it.price_heb], ["Retail", it.price_retail]]
      : category === "oli"
        ? [["HEB", it.price_heb], ["Retail", it.price_retail]]
        : [["Grosir", it.price_grosir], ["External", it.price_external], ["HEB", it.price_heb], ["Retail", it.price_retail]];

const getPriceAreaClass = (category: Cat) =>
  category === "oli" ? "w-full lg:w-60" : category === "sparepart" || category === "jasa_ban" ? "w-full lg:w-[21rem]" : "w-full lg:w-[28rem]";

// Isi tiap kategori filter tertutup secara default (ringkas); terbuka saat judul
// diklik atau saat kategori itu punya pilihan aktif.
type OpenMap = Partial<Record<FilterKey, boolean>>;

function FilterPanel({ items, filters, setFilters, category, openMap, setOpenMap, setCategory }: { items: PricelistItem[]; filters: Filters; setFilters: (f: Filters) => void; category: Cat; openMap: OpenMap; setOpenMap: (m: OpenMap) => void; setCategory: (c: Cat) => void }) {
  const groups: { key: FilterKey; label: string }[] = isJasa(category) ? [
    { key: "kategori", label: "Kategori" },
  ] : category === "sparepart" ? [
    { key: "brand", label: "Brand" }, { key: "type", label: "Type" },
  ] : category === "oli" ? [
    { key: "brand", label: "Brand" }, { key: "type", label: "Type" }, { key: "unit", label: "Satuan" },
  ] : [
    { key: "brand", label: "Brand" }, { key: "type", label: "Type" }, { key: "pattern", label: "Pattern" }, { key: "rim", label: "Rim" },
  ];
  const toggle = (k: FilterKey, v: string) => {
    const cur = filters[k];
    setFilters({ ...filters, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const toggleOpen = (k: FilterKey, open: boolean) => setOpenMap({ ...openMap, [k]: !open });
  const [golOpen, setGolOpen] = useState(false);
  useEffect(() => { setGolOpen(false); }, [category]);
  return (
    <div className="space-y-3.5">
      {isJasa(category) && (
        <>
      <div className="grid grid-cols-2 gap-1 rounded-full border border-border/60 bg-muted/40 p-0.5" role="tablist" aria-label="Jenis jasa">
        {([["jasa", "Service"], ["jasa_ban", "Ban"]] as const).map(([id, l]) => (
          <Button key={id} variant="ghost" role="tab" aria-selected={category === id} onClick={() => setCategory(id)}
            className={cn("min-h-[26px] h-auto rounded-full py-0.5 text-xs", category === id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{l}</Button>
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full rounded-full" onClick={() => setGolOpen(true)}>
        <CarFront className="h-4 w-4" /> {category === "jasa_ban" ? "Daftar Ukuran Kendaraan" : "Daftar Golongan Kendaraan"}
      </Button>
      <Dialog open={golOpen} onOpenChange={setGolOpen}>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-3xl flex-col overflow-hidden rounded-3xl p-0">
          <DialogHeader className="border-b border-border/60 px-5 py-4">
            <DialogTitle>{category === "jasa_ban" ? "Ukuran Kendaraan (Harga Jasa Ban)" : "Golongan Kendaraan (Harga Jasa)"}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  {(category === "jasa_ban" ? UKURAN_COLUMNS : GOLONGAN_COLUMNS).map((c) => (
                    <th key={c} className="border border-border/60 bg-muted px-3 py-2 text-left font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(category === "jasa_ban" ? UKURAN_ROWS : GOLONGAN_ROWS).map((row, i) => (
                  <tr key={i} className="odd:bg-muted/30">
                    {row.map((cell, j) => (
                      <td key={j} className="border border-border/40 px-3 py-1.5 align-top">{cell || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
      {category === "sparepart" && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
          <div className="mb-1.5 text-xs font-semibold">Ketentuan Spareparts <span className="font-normal text-muted-foreground">(beli di luar)</span></div>
          <ul className="space-y-0.5 text-[11px] leading-4 text-muted-foreground">
            <li className="flex justify-between gap-2"><span>Rp 0 s/d Rp 50.000</span><span className="shrink-0 font-medium text-foreground">dibagi 50%</span></li>
            <li className="flex justify-between gap-2"><span>Rp 51.000 s/d Rp 250.000</span><span className="shrink-0 font-medium text-foreground">dibagi 60%</span></li>
            <li className="flex justify-between gap-2"><span>Rp 251.000 s/d Rp 500.000</span><span className="shrink-0 font-medium text-foreground">dibagi 65%</span></li>
            <li className="flex justify-between gap-2"><span>Rp 501.000 ke atas</span><span className="shrink-0 font-medium text-foreground">dibagi 70%</span></li>
            <li className="flex justify-between gap-2 border-t border-border/50 pt-1 mt-1"><span>Terkecuali Filter</span><span className="shrink-0 font-medium text-foreground">dibagi 40%</span></li>
          </ul>
        </div>
      )}
      {groups.map(({ key, label }) => {
        // counts reflect other active filters
        const base = items.filter((it) => (Object.keys(filters) as FilterKey[]).every((k) => k === key || !filters[k].length || filters[k].includes(fieldOf(it, k))));
        const counts = new Map<string, number>();
        base.forEach((it) => { const v = fieldOf(it, key); if (v) counts.set(v, (counts.get(v) ?? 0) + 1); });
        const opts = [...counts.entries()].sort((a, b) => key === "rim" ? Number(a[0]) - Number(b[0]) : a[0].localeCompare(b[0]));
        const picked = filters[key].length;
        const open = openMap[key] === true || picked > 0;
        return (
          <div key={key}>
            <button type="button" onClick={() => toggleOpen(key, open)} aria-expanded={open} aria-controls={`filter-group-${key}`}
              className="mb-1.5 flex w-full items-center gap-1.5 text-sm font-semibold">
              <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-90")} />
              <span className="h-3.5 w-[3px] rounded bg-primary" />
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              {picked > 0 && <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{picked}</span>}
            </button>
            {open && (
              <div id={`filter-group-${key}`} className={cn("flex flex-wrap gap-1", key === "pattern" && "max-h-36 overflow-auto pr-1")}>
                {opts.map(([v, c]) => {
                  const on = filters[key].includes(v);
                  return (
                    <Button variant="ghost" key={v} onClick={() => toggle(key, v)} aria-pressed={on}
                      className={cn("min-h-[24px] lg:min-h-[20px] h-auto min-w-0 max-w-full gap-1 whitespace-normal rounded-full border px-2 py-0.5 text-[11px] leading-[14px] transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "border-border bg-muted/40 text-foreground hover:bg-muted hover:text-foreground")}>
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{key === "rim" ? `R${v}` : v}</span> <span className="shrink-0 opacity-80">{c}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="w-full min-h-[28px] py-1 text-xs" onClick={() => setFilters(EMPTY)}>Reset filter</Button>
    </div>
  );
}

const PricelistPage = () => {
  const { user } = useAuth();
  const { isStaff, isAdmin } = useUserRole();
  const canImport = isStaff || isAdmin;
  const qc = useQueryClient();
  const memory = usePricelistMemory<Cat, Filters, OpenMap>(user?.id, { category: "ban", filters: EMPTY, openMap: {}, limit: PAGE },
    (c): c is Cat => c === "ban" || c === "oli" || c === "sparepart" || c === "jasa" || c === "jasa_ban");
  const { category, setCategory, q, setQ, filters, setFilters, limit, setLimit, openMap, setOpenMap } = memory;
  const categoryLabel = category === "jasa_ban" ? "Jasa Ban" : category === "jasa" ? "Jasa" : category === "oli" ? "Oli" : category === "sparepart" ? "Sparepart" : "Ban";
  const [importOpen, setImportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [soon, setSoon] = useState<string | null>(null);
  const restoredRef = useRef<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["pricelist-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      return (await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()).data;
    },
  });
  const name = profile?.full_name || (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Tim";

  // Restore last scroll position once the current tab's rows are rendered.
  const savedScroll = memory.scroll;
  useEffect(() => {
    if (isLoadingRef.current || restoredRef.current === category) return;
    restoredRef.current = category;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: "auto" })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
  const isLoadingRef = useRef(true);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["pricelist", category],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const all: PricelistItem[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("pricelist_items").select("*").eq("category", category)
          .order("brand").order("rim").order("price_retail").range(from, from + 999);
        if (error) throw error;
        all.push(...(data as PricelistItem[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  isLoadingRef.current = isLoading;
  const filtered = useMemo(() => items.filter((it) =>
    (Object.keys(filters) as FilterKey[]).every((k) => !filters[k].length || filters[k].includes(fieldOf(it, k))) && matchesQuery(it, q),
  ), [items, filters, q]);

  const lastUpdate = items.reduce((m, it) => (it.updated_at && it.updated_at > m ? it.updated_at : m), "");
  const activeCount = Object.values(filters).reduce((n, a) => n + a.length, 0);

  return (
    <div className="min-h-screen bg-background pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <Navbar />
      <div className="container mx-auto max-w-7xl px-4 pt-6 lg:pt-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold lg:text-3xl">{greeting()}, <span className="font-bold">{name}</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length.toLocaleString("id-ID")} item {categoryLabel.toLowerCase()}
              {lastUpdate && ` · update terakhir ${new Date(lastUpdate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          </div>
          {canImport && (
            <Button onClick={() => setImportOpen(true)} className="shrink-0 rounded-full shadow-lg" aria-label="Import Excel">
              <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Import Excel</span>
            </Button>
          )}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <div className="sticky top-16 z-30 -mx-4 bg-background px-4 py-2.5 lg:mx-0 lg:px-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder={isJasa(category) ? "Cari nama jasa atau kategori…" : category === "sparepart" ? "Cari kode, nama part, brand, mobil…" : category === "oli" ? "Cari kode, nama, brand, viskositas…" : "Cari ukuran, brand, mobil… (1856514)"}
                    className="w-full rounded-full pl-9 pr-8" aria-label="Cari pricelist" />
                  {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Hapus pencarian"><X className="h-4 w-4 text-muted-foreground" /></button>}
                </div>
                <Button variant="outline" size="icon" className="relative shrink-0 rounded-full lg:hidden" onClick={() => setFilterOpen(true)} aria-label="Filter">
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeCount}</span>}
                </Button>
              </div>
            </div>

            <section className="min-w-0">
            {isError ? (

              <div className="py-16 text-center text-sm text-destructive">Pricelist gagal dimuat. <Button variant="link" onClick={() => qc.invalidateQueries({ queryKey: ["pricelist", category] })}>Coba lagi</Button></div>
            ) : isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Memuat pricelist…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {items.length === 0 ? "Belum ada data. Import file Excel untuk mengisi pricelist." : `Tidak ada ${categoryLabel.toLowerCase()} yang cocok dengan pencarian/filter.`}
              </div>
            ) : (
              <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/60">
                <div className="hidden items-center border-b border-border/60 bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground lg:flex">
                  <div className="min-w-0 flex-1 text-center">Nama barang</div>
                  <div className={cn("grid shrink-0 text-center", getPriceAreaClass(category), gridCols(category))}>
                    {getPriceColumns(category, filtered[0]).map(([label]) => <div key={label}>{label}</div>)}
                  </div>
                </div>
                {filtered.slice(0, limit).map((it) => (
                  <div key={it.id} className="overflow-hidden border-b border-border/50 px-3 py-2 last:border-b-0 hover:bg-muted/30 lg:flex lg:items-center lg:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <div className="truncate text-[11px] font-semibold uppercase text-primary">{isJasa(category) ? it.kategori : it.brand}{category === "ban" && it.pattern ? ` · ${it.pattern}` : ""}</div>
                        {it.type && <Badge variant="secondary" className="h-4 min-h-0 shrink-0 border px-1 py-0 text-[10px] leading-none">{it.type}</Badge>}
                        {it.rim != null && <Badge variant="outline" className="h-4 min-h-0 shrink-0 border px-1 py-0 text-[10px] leading-none">R{it.rim}</Badge>}
                      </div>
                      <PricelistItemName name={category !== "ban" ? it.item_name : it.size} vehicleModel={it.vehicle_model} />
                      {category !== "ban" && !isJasa(category) && (it.item_code || it.unit) && (
                        <div className="truncate text-[11px] leading-5 text-muted-foreground">
                          {[it.item_code, it.unit].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className={cn("mt-1.5 grid shrink-0 divide-x divide-border/60 rounded bg-muted/35 lg:mt-0 lg:bg-transparent", getPriceAreaClass(category), gridCols(category))}>
                      {getPriceColumns(category, it).map(([label, value]) => (
                        <div key={label} className="min-w-0 px-1 py-1 text-center lg:px-0 lg:py-0">
                          <div className="truncate text-[10px] text-muted-foreground lg:hidden">{label}</div>
                          <div className={cn("truncate whitespace-nowrap text-xs font-semibold sm:text-[13px]", (label === "Retail" || label === "Gol A" || label === "Small") && "text-primary")}>{rp(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {limit < filtered.length && (
                  <Button variant="ghost" className="w-full rounded-none" onClick={() => setLimit((l) => l + PAGE)}>
                    Tampilkan lagi ({(filtered.length - limit).toLocaleString("id-ID")} tersisa)
                  </Button>
                )}
              </div>
            )}
            </section>
          </div>


          <aside className="sticky top-16 hidden self-start lg:block">
            <div className="max-h-[calc(100vh-6.5rem)] overflow-y-auto overscroll-contain rounded-3xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4" /> Filter</div>
              <FilterPanel category={category} items={items} filters={filters} setFilters={(f) => { setFilters(f); setLimit(PAGE); }} openMap={openMap} setOpenMap={setOpenMap} setCategory={setCategory} />
            </div>
          </aside>
        </div>
      </div>

      <nav className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-full border border-border/60 bg-card/80 p-1 shadow-xl backdrop-blur-xl lg:bottom-6">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <Button variant="ghost" key={id} onClick={() => {
              if (id === "ban" || id === "oli" || id === "sparepart" || id === "jasa") { setCategory(id); setSoon(null); window.scrollTo({ top: 0 }); }
              else setSoon(label);
            }} aria-label={label} aria-pressed={id === category || (id === "jasa" && isJasa(category))}
            className={cn("min-h-[30px] h-auto flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3.5 sm:text-xs",
              id === category || (id === "jasa" && isJasa(category)) ? "bg-primary text-primary-foreground shadow hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            <Icon className="!h-3.5 !w-3.5 shrink-0" />
            <span className={cn("whitespace-nowrap", !(id === category || (id === "jasa" && isJasa(category))) && "hidden sm:inline")}>{label}</span>
          </Button>
        ))}
      </nav>
      {soon && (
        <div className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs text-background lg:bottom-20" onAnimationEnd={() => setSoon(null)}>
          Pricelist {soon} segera hadir
          <button className="ml-2 underline" onClick={() => setSoon(null)}>OK</button>
        </div>
      )}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-auto rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>Filter {categoryLabel}</SheetTitle></SheetHeader>
          <div className="mt-4"><FilterPanel category={category} items={items} filters={filters} setFilters={(f) => { setFilters(f); setLimit(PAGE); }} openMap={openMap} setOpenMap={setOpenMap} setCategory={setCategory} /></div>
        </SheetContent>
      </Sheet>

      <PricelistImportDialog key={category} category={category} open={importOpen} onOpenChange={setImportOpen} current={items}
        onDone={() => qc.invalidateQueries({ queryKey: ["pricelist", category] })} />
    </div>
  );
};

export default PricelistPage;
