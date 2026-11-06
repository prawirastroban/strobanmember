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
const RANK = ["bg-amber-400 text-amber-950", "bg-slate-400 text-white", "bg-amber-700 text-white"];

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
      <h2 id="reco-title" className="text-[15px] font-bold text-foreground">Rekomendasi untuk kendaraanmu</h2>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Car className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">Kendaraan aktif</p>
          <p className="truncate text-[14px] font-bold text-foreground">
            {vehicle ? `${vehicle.brand} ${vehicle.model}${vehicle.year ? " " + vehicle.year : ""} · ${vehicle.license_plate}` : user ? "Belum ada kendaraan" : "Masuk untuk memilih mobil"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (user ? (vehicles.length ? setSheet(true) : navigate("/my-vehicles")) : navigate("/auth"))}
          className="min-h-[44px] px-2 text-[13px] font-semibold text-primary"
        >
          {vehicles.length ? "Ganti" : user ? "Tambah" : "Masuk"}
        </button>
      </div>

      <div className="mt-3 flex gap-5 border-b border-border/60" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => pickTab(t.key)}
            className={`-mb-px min-h-[40px] border-b-2 px-1 text-[13px] font-semibold transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {brands.map((b) => (
          <button key={b} onClick={() => setBrand(b)}
            className={`min-h-[36px] shrink-0 rounded-xl border px-3.5 text-[12px] font-semibold ${brand === b ? "border-primary bg-primary/5 text-primary" : "border-border/60 bg-card text-foreground"}`}>
            {b}
          </button>
        ))}
      </div>

      <div className="mt-2 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse bg-muted/40" />)
        ) : list.length === 0 ? (
          <p className="p-5 text-center text-[13px] text-muted-foreground">Belum ada rekomendasi.</p>
        ) : (
          list.map((it, i) => (
            <button key={it.id} onClick={() => navigate(it.to)} className="flex w-full items-center gap-3 p-3 text-left">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${RANK[i]}`}>{i + 1}</span>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50">
                {it.image ? <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <TabIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{it.brand}</p>
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">{it.title}</p>
              </div>
              {it.price ? <p className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">{rp(it.price)}</p> : null}
            </button>
          ))
        )}
      </div>

      <button onClick={() => navigate(tab === "ban" ? "/katalog?tab=ban" : "/katalog")}
        className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card text-[13px] font-semibold text-foreground">
        Lihat semua {TABS.find((t) => t.key === tab)?.label} <ArrowRight className="h-4 w-4" />
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
