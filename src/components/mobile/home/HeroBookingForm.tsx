import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Wrench, Car, CalendarDays, ArrowRight, ChevronDown, Search, Plus, Clock, MapPin,
  LogIn, Sparkles, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { filterFutureSlots, isSameLocalDay, TIME_TICK_MS } from "@/lib/timeSlots";
import { useSlotAvailability } from "@/hooks/useSlotAvailability";
import heroImg from "@/assets/hero-garage.jpg";
import { Konsultasi } from "@/components/mobile/home/PopularServices";

type ServiceOpt = { id: string; name: string };
type VehicleOpt = { id: string; label: string };
type BranchOpt  = { id: string; name: string; city: string };

const BRANCHES: BranchOpt[] = [
  { id: "bandung",     name: "Bengkel Stroban Bandung",     city: "Bandung" },
  { id: "tasikmalaya", name: "Bengkel Stroban Tasikmalaya", city: "Tasikmalaya" },
  { id: "cirebon",     name: "Bengkel Stroban Cirebon",     city: "Cirebon" },
  { id: "yogyakarta",  name: "Bengkel Stroban Yogyakarta",  city: "Yogyakarta" },
];

// Generate the next N days starting from today (local-midnight).
const buildUpcomingDays = (count: number): Date[] => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};
const UPCOMING_DAYS = buildUpcomingDays(14);

const ALL_SLOTS_CONST = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

const HeroBookingForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();

  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const [openSheet, setOpenSheet] = useState<null | "service" | "vehicle" | "date" | "guest-vehicle">(null);
  const [vehicleSearch, setVehicleSearch] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(t);
  }, []);

  const ALL_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
  const availableSlots = useMemo(
    () => filterFutureSlots(ALL_SLOTS, date ?? null, now),
    [date, now],
  );

  useEffect(() => {
    if (time && !availableSlots.includes(time)) setTime(null);
  }, [availableSlots, time]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id,name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (active && data) setServices(data);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) { setVehicles([]); setVehicleId(null); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id,brand,model,license_plate,is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      if (active && data) {
        setVehicles(data.map((v) => ({
          id: v.id,
          label: `${v.brand} ${v.model} • ${v.license_plate}`,
        })));
        const def = data.find((v) => v.is_default) || data[0];
        if (def) setVehicleId(def.id);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const serviceLabel = useMemo(
    () => services.find((s) => s.id === serviceId)?.name ?? "Pilih layanan",
    [services, serviceId]
  );

  const vehicleLabel = useMemo(() => {
    if (!user) return "Pilih kendaraan";
    return vehicles.find((v) => v.id === vehicleId)?.label ?? "Pilih kendaraan";
  }, [vehicles, vehicleId, user]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => v.label.toLowerCase().includes(q));
  }, [vehicles, vehicleSearch]);

  const dateLabel = date
    ? `${format(date, "EEE, d MMM", { locale: idLocale })}${time ? ` • ${time}` : ""}`
    : "Pilih tanggal & jam";
  const branchLabel = useMemo(
    () => BRANCHES.find((b) => b.id === branchId)?.name ?? "Pilih cabang",
    [branchId]
  );

  const handleBook = () => {
    if (!user) { openLoginDialog("/booking"); return; }
    const params = new URLSearchParams();
    if (serviceId) params.set("service", serviceId);
    if (vehicleId) params.set("vehicle", vehicleId);
    if (branchId) params.set("branch", branchId);
    if (date) params.set("date", format(date, "yyyy-MM-dd"));
    const slot = time || availableSlots[0];
    if (date && slot) params.set("time", slot);
    navigate(`/booking${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Guest taps "Kendaraan" → open consultation directly inside hero sheet
  const handleVehicleFieldClick = () => {
    if (user) { setOpenSheet("vehicle"); return; }
    setOpenSheet("guest-vehicle");
  };

  return (
    <section className="lg:hidden relative">
      <div className="relative h-[300px] w-full overflow-hidden">
        <img src={heroImg} alt="Bengkel Stroban" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/65 via-foreground/45 to-background" />
        <div className="relative z-10 px-5 pt-10 pb-24 text-background">
          <p className="text-[11px] font-semibold tracking-widest uppercase opacity-80">Sahabat Stroban</p>
          <h1 className="text-2xl font-bold leading-tight mt-1">
            Servis mobil cepat,<br/>tanpa antri.
          </h1>
          <p className="text-sm opacity-85 mt-1.5">Booking sekarang, langsung dikerjakan.</p>
        </div>
      </div>

      <div className="px-4 -mt-20 relative z-20">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-3 space-y-2">
          <FieldRow
            icon={Wrench}
            label="Layanan"
            value={serviceLabel}
            onClick={() => setOpenSheet("service")}
          />
          <FieldRow
            icon={Car}
            label="Kendaraan"
            value={vehicleLabel}
            onClick={handleVehicleFieldClick}
          />
          <FieldRow
            icon={CalendarDays}
            label="Jadwal & Cabang"
            value={`${dateLabel} • ${branchLabel}`}
            onClick={() => setOpenSheet("date")}
          />

          <Button
            onClick={handleBook}
            className="w-full h-12 text-base font-semibold mt-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
          >
            Booking Sekarang <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Service sheet */}
      <Sheet open={openSheet === "service"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Pilih layanan</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-1">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setServiceId(s.id); setOpenSheet(null); }}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl border text-sm transition",
                  s.id === serviceId
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                {s.name}
              </button>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground px-1 py-4">Memuat layanan…</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Vehicle sheet (member only) */}
      <Sheet open={openSheet === "vehicle"} onOpenChange={(o) => { if (!o) { setOpenSheet(null); setVehicleSearch(""); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Pilih kendaraan</SheetTitle></SheetHeader>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder="Cari kendaraan..."
              className="pl-9"
            />
          </div>

          <button
            onClick={() => { setOpenSheet(null); setVehicleSearch(""); navigate("/my-vehicles"); }}
            className="mt-3 w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition text-left"
          >
            <span className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Tambah Kendaraan Saya</span>
              <span className="block text-[11px] text-muted-foreground">Simpan data mobil untuk booking lebih cepat</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
          </button>

          <div className="mt-3 space-y-1">
            {filteredVehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVehicleId(v.id); setOpenSheet(null); setVehicleSearch(""); }}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl border text-sm transition",
                  v.id === vehicleId
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                {v.label}
              </button>
            ))}
            {vehicles.length === 0 && (
              <div className="px-1 py-4 space-y-2">
                <p className="text-sm text-muted-foreground">Belum ada kendaraan.</p>
                <Button variant="outline" className="w-full" onClick={() => { setOpenSheet(null); navigate("/my-vehicles"); }}>
                  Tambah Kendaraan
                </Button>
              </div>
            )}
            {filteredVehicles.length === 0 && vehicles.length > 0 && (
              <p className="text-sm text-muted-foreground px-1 py-4 text-center">
                Tidak ada hasil untuk "{vehicleSearch}"
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Guest vehicle sheet — embedded AI consultation + login shortcut */}
      <Sheet open={openSheet === "guest-vehicle"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto p-4">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Konsultasi Kendaraan Anda
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mt-1.5">
            Belum login? Tidak masalah. Isi data mobil & keluhan Anda — AI kami bantu rekomendasi layanan.
          </p>

          <div className="mt-3">
            <Konsultasi embedded defaultMode="complaint" />
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <button
              onClick={() => { setOpenSheet(null); openLoginDialog("/booking"); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/60 text-sm font-semibold text-foreground transition active:scale-[0.99]"
            >
              <LogIn className="h-4 w-4" />
              Sudah tahu layanan? Login & Booking
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Date sheet */}
      <Sheet open={openSheet === "date"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Pilih jadwal & cabang</SheetTitle></SheetHeader>

          {/* Horizontal swipeable date strip */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> Tanggal
              </div>
              <span className="text-[10px] text-muted-foreground">Geser ←/→</span>
            </div>
            <div
              className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {UPCOMING_DAYS.map((d) => {
                const active = !!date && isSameLocalDay(d, date);
                const isToday = isSameLocalDay(d, now);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => setDate(d)}
                    className={cn(
                      "snap-start shrink-0 w-[64px] h-[80px] rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.6)]"
                        : "bg-card border-border/60 text-foreground hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] uppercase tracking-wide font-semibold",
                      active ? "opacity-90" : "text-muted-foreground"
                    )}>
                      {format(d, "EEE", { locale: idLocale })}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {format(d, "d")}
                    </span>
                    <span className={cn(
                      "text-[10px]",
                      active ? "opacity-90" : "text-muted-foreground"
                    )}>
                      {isToday ? "Hari ini" : format(d, "MMM", { locale: idLocale })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {date && (
            <div className="mt-5 pt-4 px-1 pb-6 border-t border-border/60 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Jam
                </div>
                {isSameLocalDay(date, now) && (
                  <span className="text-[10px] text-primary">+30 mnt dari sekarang</span>
                )}
              </div>
              {availableSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  Slot habis untuk hari ini. Pilih tanggal lain.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => { setTime(slot); setOpenSheet(null); }}
                      className={cn(
                        "h-11 rounded-xl border text-[13px] font-semibold transition-all",
                        time === slot
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.5)]"
                          : "bg-card border-border/60 active:scale-95"
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Branch picker */}
          <div className="mt-5 pt-4 px-1 pb-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Cabang
            </div>
            <div className="space-y-1.5">
              {BRANCHES.map((b) => (
                <BranchRow
                  key={b.id}
                  branch={b}
                  date={date ?? null}
                  active={b.id === branchId}
                  onSelect={() => setBranchId(b.id)}
                />
              ))}
            </div>
            {!date && (
              <p className="mt-2 px-1 text-[10px] text-muted-foreground">
                Pilih tanggal dulu untuk melihat ketersediaan slot tiap cabang.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

const BranchRow = ({
  branch, date, active, onSelect,
}: {
  branch: BranchOpt;
  date: Date | null;
  active: boolean;
  onSelect: () => void;
}) => {
  const { slots, loading } = useSlotAvailability(date ? branch.id : null, date, ALL_SLOTS_CONST);

  const totals = useMemo(() => {
    const list = Object.values(slots);
    if (!date || list.length === 0) {
      return { remaining: null as number | null, total: 0, isFull: false };
    }
    const total = list.reduce((acc, s) => acc + s.max, 0);
    const remaining = list.reduce((acc, s) => acc + (s.status === "available" ? s.remaining : 0), 0);
    return { remaining, total, isFull: remaining <= 0 };
  }, [slots, date]);

  const showStatus = !!date && !loading && totals.remaining !== null;
  const isFull = showStatus && totals.isFull;

  return (
    <div className="flex items-stretch gap-1.5">
      <button
        type="button"
        onClick={onSelect}
        disabled={isFull}
        aria-disabled={isFull}
        className={cn(
          "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition",
          isFull
            ? "border-border/60 bg-muted/40 opacity-60 cursor-not-allowed"
            : active
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted active:scale-[0.99]"
        )}
      >
        <span className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          isFull ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        )}>
          <MapPin className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-foreground truncate">{branch.name}</span>
          <span className="block text-[11px] text-muted-foreground">{branch.city}</span>
        </span>
        {showStatus && (
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full",
              isFull
                ? "bg-destructive/10 text-destructive"
                : totals.remaining! <= 2
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              isFull ? "bg-destructive" : totals.remaining! <= 2 ? "bg-amber-500" : "bg-emerald-500"
            )} />
            {isFull ? "Penuh" : `${totals.remaining}/${totals.total} slot`}
          </span>
        )}
        {!showStatus && date && (
          <span className="shrink-0 text-[10px] text-muted-foreground">memuat…</span>
        )}
      </button>

      {isFull && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Info ketersediaan"
              className="shrink-0 h-auto px-2 rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition flex items-center justify-center"
            >
              <Info className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="center" className="w-64 p-3 text-xs leading-relaxed">
            <p className="font-semibold text-foreground mb-1">Slot di cabang ini sedang penuh 🙏</p>
            <p className="text-muted-foreground">
              Wah, ramai sekali hari ini di <span className="font-medium text-foreground">{branch.city}</span>!
              Coba pilih tanggal lain atau cabang terdekat lainnya — tim kami siap melayani Anda secepatnya.
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

const FieldRow = ({
  icon: Icon, label, value, onClick,
}: {
  icon: typeof Wrench; label: string; value: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-muted/60 active:scale-[0.99] transition text-left"
  >
    <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</span>
      <span className="block text-sm font-semibold text-foreground truncate mt-0.5">{value}</span>
    </span>
    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
  </button>
);

export default HeroBookingForm;
