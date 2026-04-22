import { useEffect, useMemo, useState } from "react";
import { Search, Gift, MapPin, CalendarDays, Wrench, ChevronRight, Clock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BRANCHES = ["Bandung", "Tasikmalaya", "Cirebon", "Yogyakarta"];

const TIMES = [
  "08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00",
];

interface ServiceLite {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const todayISO = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

type Sheet = null | "branch" | "date" | "service";

const MobileHero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const name =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Sahabat";

  const [branch, setBranch] = useState<string>("Bandung");
  const [date, setDate] = useState<string>(todayISO());
  const [time, setTime] = useState<string>("09:00");
  const [service, setService] = useState<ServiceLite | null>(null);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [services, setServices] = useState<ServiceLite[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (sheet !== "service" || services.length) return;
    setLoadingServices(true);
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id,name,category,price,duration")
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("sort_order", { ascending: true });
      setServices((data as ServiceLite[]) || []);
      setLoadingServices(false);
    })();
  }, [sheet, services.length]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [services, query]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("branch", branch);
    params.set("date", date);
    params.set("time", time);
    if (service) params.set("service", service.id);
    const path = `/booking?${params.toString()}`;
    if (user) navigate(path);
    else openLoginDialog(path);
  };

  // Generate next 14 days for date picker
  const nextDays = useMemo(() => {
    const arr: { iso: string; label: string; sub: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      arr.push({
        iso: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        sub: i === 0 ? "Hari ini" : d.toLocaleDateString("id-ID", { weekday: "short" }),
      });
    }
    return arr;
  }, []);

  const dateLabel = useMemo(() => {
    try {
      return fmtDate(new Date(date + "T00:00:00"));
    } catch {
      return date;
    }
  }, [date]);

  return (
    <>
      <section className="lg:hidden relative bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground pt-3 pb-12 px-4 -mt-px">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="text-[11px] opacity-80 leading-none mb-1">Selamat datang 👋</p>
            <h2 className="text-base font-semibold truncate">
              {user ? `Halo, ${name}` : "Booking servis lebih cepat"}
            </h2>
          </div>
          <button
            onClick={() => (user ? navigate("/loyalty") : openLoginDialog("/loyalty"))}
            aria-label="Loyalitas & Hadiah"
            className="shrink-0 h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-primary-foreground active:scale-95 transition shadow-sm"
          >
            <Gift className="h-5 w-5" />
          </button>
        </div>

        {/* Traveloka-style segmented search */}
        <div className="bg-card text-foreground rounded-2xl shadow-xl overflow-hidden border border-white/10">
          {/* Branch */}
          <button
            onClick={() => setSheet("branch")}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition text-left"
          >
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
                Cabang
              </p>
              <p className="text-sm font-semibold truncate">{branch}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="h-px bg-border mx-4" />

          {/* Date & Time */}
          <button
            onClick={() => setSheet("date")}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition text-left"
          >
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
                Tanggal & Jam
              </p>
              <p className="text-sm font-semibold truncate">
                {dateLabel} • {time}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="h-px bg-border mx-4" />

          {/* Service */}
          <button
            onClick={() => setSheet("service")}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition text-left"
          >
            <Wrench className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
                Layanan
              </p>
              <p className="text-sm font-semibold truncate">
                {service ? service.name : "Pilih layanan (opsional)"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Search button */}
          {/* Search button — Apple-style liquid glass */}
          <div className="p-2.5 bg-gradient-to-b from-transparent to-muted/30">
            <button
              onClick={handleSearch}
              className="group relative w-full overflow-hidden rounded-2xl py-3.5 px-4 font-semibold text-[15px] text-primary-foreground tracking-tight active:scale-[0.98] transition-transform duration-200 ease-out shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55),0_2px_6px_-2px_hsl(var(--primary)/0.4)] ring-1 ring-white/15"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.92) 100%)",
              }}
            >
              {/* Glossy top highlight */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent"
              />
              {/* Shine sweep on press/hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-0 group-active:translate-x-[400%] transition-transform duration-700 ease-out"
              />
              <span className="relative inline-flex items-center justify-center gap-2">
                <Search className="h-4 w-4" strokeWidth={2.5} />
                Cari & Booking
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Branch picker */}
      <Dialog open={sheet === "branch"} onOpenChange={(o) => !o && setSheet(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border">
          <DialogHeader className="px-5 pt-5 pb-2 text-left">
            <DialogTitle className="text-lg font-bold">Pilih Cabang</DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan cabang Sahabat Stroban terdekat.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 space-y-1.5">
            {BRANCHES.map((b) => {
              const active = b === branch;
              return (
                <button
                  key={b}
                  onClick={() => {
                    setBranch(b);
                    setSheet(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{b}</p>
                    <p className="text-[11px] text-muted-foreground">Buka 08:00 – 17:00</p>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Date & Time picker */}
      <Dialog open={sheet === "date"} onOpenChange={(o) => !o && setSheet(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border max-h-[85vh] flex flex-col">
          <DialogHeader className="px-5 pt-5 pb-2 text-left">
            <DialogTitle className="text-lg font-bold">Tanggal & Jam</DialogTitle>
            <DialogDescription className="text-xs">
              Pilih jadwal kunjungan Sahabat.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pt-2 pb-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Tanggal
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
              {nextDays.map((d) => {
                const active = d.iso === date;
                return (
                  <button
                    key={d.iso}
                    onClick={() => setDate(d.iso)}
                    className={`shrink-0 w-16 py-2 rounded-xl border text-center transition ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <p className="text-[10px] font-medium opacity-80">{d.sub}</p>
                    <p className="text-sm font-bold">{d.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 pb-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Jam
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TIMES.map((t) => {
                const active = t === time;
                return (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={`py-2 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-1 ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border p-4">
            <Button onClick={() => setSheet(null)} className="w-full">
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service picker */}
      <Dialog open={sheet === "service"} onOpenChange={(o) => !o && setSheet(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border max-h-[85vh] flex flex-col">
          <DialogHeader className="px-5 pt-5 pb-2 text-left">
            <DialogTitle className="text-lg font-bold">Pilih Layanan</DialogTitle>
            <DialogDescription className="text-xs">
              Opsional. Pilih layanan untuk pre-isi formulir booking.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari layanan..."
                className="pl-9 h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1.5">
            <button
              onClick={() => {
                setService(null);
                setSheet(null);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                !service
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Belum pilih layanan</p>
                <p className="text-[11px] text-muted-foreground">Pilih nanti di halaman booking</p>
              </div>
              {!service && <Check className="h-4 w-4 text-primary" />}
            </button>

            {loadingServices ? (
              <p className="text-center text-xs text-muted-foreground py-6">Memuat...</p>
            ) : filteredServices.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                Tidak ada hasil.
              </p>
            ) : (
              filteredServices.map((s) => {
                const active = service?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setService(s);
                      setSheet(null);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        active ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {s.category} • {s.duration} mnt
                      </p>
                    </div>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileHero;
