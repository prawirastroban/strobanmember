import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Disc3, Droplet, Wrench, ArrowRight, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Tab = "ban" | "oli" | "servis";
const TABS: { key: Tab; label: string }[] = [
  { key: "ban", label: "Ban" },
  { key: "oli", label: "Oli" },
  { key: "servis", label: "Servis Lainnya" },
];
const CLICK_KEY = "stroban_reco_tab_clicks";
const VEH_KEY = "stroban_reco_vehicle";

type Vehicle = { id: string; brand: string; model: string; year: number | null; license_plate: string; is_default: boolean; tire_size: string | null };
type Item = { id: string; brand: string; title: string; price?: number | null; image?: string | null; to: string };

const readClicks = (): Record<Tab, number> => {
  try { return { ban: 0, oli: 0, servis: 0, ...JSON.parse(localStorage.getItem(CLICK_KEY) || "{}") }; }
  catch { return { ban: 0, oli: 0, servis: 0 }; }
};
const topTab = (c: Record<Tab, number>): Tab =>
  (Object.keys(c) as Tab[]).reduce((a, b) => (c[b] > c[a] ? b : a), "ban");

const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const pretty = (s: string) =>
  s === "Semua" ? s : (s || "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const TrustStrip = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clicks, setClicks] = useState(readClicks);
  const [tab, setTab] = useState<Tab>(() => topTab(readClicks()));
  const [brand, setBrand] = useState("Semua");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehId, setVehId] = useState<string | null>(() => localStorage.getItem(VEH_KEY));
  const [sheet, setSheet] = useState(false);
  const [tires, setTires] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setVehicles([]); return; }
    supabase.from("vehicles").select("id,brand,model,year,license_plate,is_default,tire_size")
      .eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at")
      .then(({ data }) => setVehicles((data as Vehicle[]) ?? []));
  }, [user]);

  useEffect(() => {
    Promise.all([
      supabase.from("tires").select("id,brand,type,size,image_url,click_count").eq("is_active", true).order("click_count", { ascending: false }).limit(200),
      supabase.from("services").select("id,name,category,price,image_url").eq("is_active", true).limit(200),
    ]).then(([t, s]) => { setTires(t.data ?? []); setServices(s.data ?? []); setLoading(false); });
  }, []);

  const vehicle = vehicles.find((v) => v.id === vehId) ?? vehicles[0] ?? null;

  const pool: Item[] = useMemo(() => {
    if (tab === "ban") {
      const size = vehicle?.tire_size?.replace(/\s/g, "").toLowerCase();
      const sorted = size
        ? [...tires].sort((a, b) => Number(b.size?.replace(/\s/g, "").toLowerCase() === size) - Number(a.size?.replace(/\s/g, "").toLowerCase() === size))
        : tires;
      return sorted.map((t) => ({ id: t.id, brand: t.brand, title: `${t.type} ${t.size}`, image: t.image_url, to: "/katalog?tab=ban" }));
    }
    const isOli = (c: string, n: string) => /oli|oil|pelumas/i.test(`${c} ${n}`);
    return services
      .filter((s) => (tab === "oli" ? isOli(s.category, s.name) : !isOli(s.category, s.name)))
      .map((s) => ({ id: s.id, brand: s.category, title: s.name, price: s.price, image: s.image_url, to: "/katalog" }));
  }, [tab, tires, services, vehicle]);

  const brands = useMemo(() => ["Semua", ...Array.from(new Set(pool.map((p) => p.brand).filter(Boolean))).slice(0, 8)], [pool]);
  const list = (brand === "Semua" ? pool : pool.filter((p) => p.brand === brand)).slice(0, 3);

  const pickTab = (k: Tab) => {
    const next = { ...clicks, [k]: clicks[k] + 1 };
    setClicks(next);
    localStorage.setItem(CLICK_KEY, JSON.stringify(next));
    setTab(k);
    setBrand("Semua");
  };
  const TabIcon = tab === "ban" ? Disc3 : tab === "oli" ? Droplet : Wrench;

  return (
    <section className="lg:hidden mt-5 mb-5 px-4" aria-labelledby="reco-title">
      <h2 id="reco-title" className="text-[14px] font-semibold tracking-tight text-foreground">Rekomendasi untuk kendaraanmu</h2>

      <div className="relative mt-2.5 flex items-center gap-3 overflow-hidden rounded-2xl border border-border/40 bg-card/60 px-3 py-2 backdrop-blur-2xl shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.25),inset_0_1px_2px_hsl(var(--background)/0.6)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-transparent" />
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Car className="h-4 w-4" />
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">Kendaraan aktif</p>
          <p className="truncate text-[13px] font-medium text-foreground">
            {vehicle ? `${vehicle.brand} ${vehicle.model}${vehicle.year ? " " + vehicle.year : ""} · ${vehicle.license_plate}` : user ? "Belum ada kendaraan" : "Masuk untuk memilih mobil"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (user ? (vehicles.length ? setSheet(true) : navigate("/my-vehicles")) : navigate("/auth"))}
          className="relative min-h-[44px] px-2 text-[12px] font-medium text-primary"
        >
          {vehicles.length ? "Ganti" : user ? "Tambah" : "Masuk"}
        </button>
      </div>

      <div className="mt-2.5 flex gap-5 border-b border-border/40" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => pickTab(t.key)}
            className={`-mb-px min-h-[40px] border-b-2 px-0.5 text-[13px] transition-colors duration-200 ${tab === t.key ? "border-primary font-semibold text-foreground" : "border-transparent font-medium text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {brands.map((b) => (
          <button key={b} onClick={() => setBrand(b)}
            className={`min-h-[32px] shrink-0 rounded-full border px-3 text-[12px] font-medium transition-colors duration-200 ${brand === b ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 bg-card/60 text-muted-foreground backdrop-blur-xl"}`}>
            {pretty(b)}
          </button>
        ))}
      </div>

      <div className="relative mt-2 divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-2xl shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.25),inset_0_1px_2px_hsl(var(--background)/0.6)]">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-[64px] animate-pulse bg-muted/30" />)
        ) : list.length === 0 ? (
          <p className="p-5 text-center text-[13px] text-muted-foreground">Belum ada rekomendasi.</p>
        ) : (
          list.map((it, i) => (
            <button key={it.id} onClick={() => navigate(it.to)} className="flex min-h-[64px] w-full items-center gap-3 px-3 py-2 text-left transition-colors active:bg-muted/30">
              <span className="w-4 shrink-0 text-center text-[11px] font-medium tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
                {it.image ? <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <TabIcon className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-muted-foreground">{pretty(it.brand)}</p>
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">{it.title}</p>
              </div>
              {it.price ? <p className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{rp(it.price)}</p> : null}
            </button>
          ))
        )}
      </div>

      <button onClick={() => navigate(tab === "ban" ? "/katalog?tab=ban" : "/katalog")}
        className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-full border border-border/40 bg-gradient-to-b from-card/80 to-card/40 text-[13px] font-medium text-foreground backdrop-blur-xl shadow-[inset_0_1px_2px_hsl(var(--background)/0.7)]">
        Lihat semua {TABS.find((t) => t.key === tab)?.label} <ArrowRight className="h-3.5 w-3.5" />
      </button>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-[28px] pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <SheetHeader><SheetTitle>Pilih kendaraan</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-2 overflow-y-auto">
            {vehicles.map((v) => (
              <button key={v.id} onClick={() => { setVehId(v.id); localStorage.setItem(VEH_KEY, v.id); setSheet(false); }}
                className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left">
                <Car className="h-5 w-5 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{v.brand} {v.model}{v.year ? ` ${v.year}` : ""} · {v.license_plate}</span>
                {vehicle?.id === v.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
            <button onClick={() => { setSheet(false); navigate("/my-vehicles"); }}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-[13px] font-semibold text-muted-foreground">
              <Plus className="h-4 w-4" /> Tambah kendaraan
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default TrustStrip;
