import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Wrench, Car, CalendarDays, ArrowRight, ChevronDown, Search, Plus, Clock, MapPin,
  Info, MessageCircle, CalendarCheck,
  Droplets, RotateCcw, ShieldCheck, Zap, Wind, ThermometerSun, Sparkles, Settings, Flame,
  type LucideIcon,
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
import { Konsultasi } from "@/components/mobile/home/PopularServices";
import heroBg from "@/assets/hero-bengkel.jpg";

type ServiceOpt = {
  id: string;
  name: string;
  category: string;
  icon: string;
  badge: string | null;
  price: number;
  duration: number;
};

const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  Droplets, RotateCcw, ShieldCheck, Wrench, Zap, Wind,
  ThermometerSun, Car, Sparkles, Settings, Flame,
};

const SERVICE_CATEGORY_GRADIENT: Record<string, string> = {
  maintenance: "from-sky-500/20 to-blue-500/10",
  tires: "from-amber-500/20 to-orange-500/10",
  electrical: "from-yellow-500/20 to-amber-500/10",
  ac: "from-cyan-500/20 to-teal-500/10",
  body: "from-fuchsia-500/20 to-pink-500/10",
  engine: "from-red-500/20 to-rose-500/10",
  detailing: "from-violet-500/20 to-purple-500/10",
};

const SERVICE_CATEGORY_LABEL: Record<string, string> = {
  maintenance: "Perawatan",
  tires: "Ban",
  electrical: "Kelistrikan",
  ac: "AC",
  body: "Body",
  engine: "Mesin",
  detailing: "Detailing",
};

const formatIDRShort = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
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

const ALL_SLOTS_CONST = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

// Guest vehicle catalog (brand → models)
const GUEST_BRAND_MODELS: Record<string, string[]> = {
  Toyota:     ["Avanza", "Innova", "Fortuner", "Rush", "Yaris", "Calya", "Agya", "Veloz", "Raize", "Hilux", "Camry"],
  Daihatsu:   ["Xenia", "Terios", "Ayla", "Sigra", "Rocky", "Gran Max", "Luxio"],
  Honda:      ["Brio", "Mobilio", "Jazz", "HR-V", "CR-V", "Civic", "City", "BR-V", "WR-V"],
  Suzuki:     ["Ertiga", "XL7", "Baleno", "Ignis", "Carry", "Swift", "Jimny"],
  Mitsubishi: ["Pajero Sport", "Xpander", "Xpander Cross", "Outlander", "Triton"],
  Nissan:     ["Livina", "X-Trail", "Serena", "Magnite", "Kicks"],
  Wuling:     ["Confero", "Almaz", "Cortez", "Air EV", "Alvez"],
  Mazda:      ["CX-5", "CX-3", "CX-30", "Mazda 2", "Mazda 3"],
  Hyundai:    ["Stargazer", "Creta", "Santa Fe", "Ioniq 5"],
  KIA:        ["Sonet", "Seltos", "Carnival", "Sportage"],
  BMW:        ["320i", "520i", "X1", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC", "GLE"],
  Lainnya:    [],
};
const GUEST_BRAND_OPTIONS = Object.keys(GUEST_BRAND_MODELS);
const GUEST_YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() - 2004 }, (_, i) => new Date().getFullYear() - i);

type HeroBookingFormProps = { variant?: "full" | "hero" | "form" };
const HeroBookingForm = ({ variant = "full" }: HeroBookingFormProps) => {
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
  const [heroMode, setHeroMode] = useState<"booking" | "complaint">("booking");

  // Guest vehicle data (only used when no logged-in user)
  const [guestBrand, setGuestBrand] = useState("");
  const [guestModel, setGuestModel] = useState("");
  const [guestCustomModel, setGuestCustomModel] = useState("");
  const [guestYear, setGuestYear] = useState("");
  const [guestTransmission, setGuestTransmission] = useState("");
  const [guestMileage, setGuestMileage] = useState("");
  const [guestPlate, setGuestPlate] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(t);
  }, []);

  const ALL_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
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
        .select("id,name,category,icon,badge,price,duration")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (active && data) setServices(data as ServiceOpt[]);
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
    if (!user) {
      const finalModel = guestModel === "Lainnya" ? guestCustomModel.trim() : guestModel.trim();
      if (guestBrand && finalModel && guestYear) {
        return `${guestBrand} ${finalModel} ${guestYear}`;
      }
      return "Pilih kendaraan";
    }
    return vehicles.find((v) => v.id === vehicleId)?.label ?? "Pilih kendaraan";
  }, [vehicles, vehicleId, user, guestBrand, guestModel, guestCustomModel, guestYear]);

  const guestFinalModel = guestModel === "Lainnya" ? guestCustomModel.trim() : guestModel.trim();
  const guestVehicleValid = !!guestBrand && !!guestFinalModel && !!guestYear;

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
      {/* Slim hero with photo background + dark overlay for legibility */}
      {variant !== "form" && (
      <div
        className="relative w-full overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "14px 16px 22px",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(15,20,35,0.88) 0%, rgba(20,28,45,0.82) 40%, rgba(26,26,46,0.88) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)" }}
        />
        <div className="relative z-10 text-white pb-10">
          <p
            className="uppercase"
            style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}
          >
            Sahabat Stroban
          </p>
          <h1
            className="mt-1"
            style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: "#fff" }}
          >
            Servis cepat, tanpa antri.
          </h1>
          <p className="mt-1" style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
            Booking sekarang, langsung dikerjakan
          </p>
        </div>
      </div>
      )}

      {variant !== "hero" && (
      <div className="relative z-20" style={{ margin: variant === "form" ? "12px 12px 0" : "-18px 12px 0" }}>
        <div className="bg-card border border-border shadow-xl" style={{ borderRadius: 18, padding: 4 }}>
          {/* Mode toggle: Booking | Keluhan */}
          <div
            role="tablist"
            aria-label="Mode hero"
            className="relative grid grid-cols-2"
            style={{ background: "hsl(var(--muted))", borderRadius: 12, padding: 3, marginBottom: 6 }}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] rounded-[10px] bg-card shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out",
                heroMode === "complaint" ? "translate-x-[calc(100%+0.25rem)]" : "translate-x-0"
              )}
            />
            <button
              role="tab"
              aria-selected={heroMode === "booking"}
              onClick={() => setHeroMode("booking")}
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 py-2 transition-colors duration-300 min-h-[44px]",
                heroMode === "booking" ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              <CalendarCheck className="h-3.5 w-3.5" /> Booking
            </button>
            <button
              role="tab"
              aria-selected={heroMode === "complaint"}
              onClick={() => setHeroMode("complaint")}
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 py-2 transition-colors duration-300 min-h-[44px]",
                heroMode === "complaint" ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Keluhan
            </button>
          </div>

          {heroMode === "booking" ? (
            <div className="animate-fade-in divide-y divide-border/60">
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                style={{
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(229,57,53,0.35)",
                  marginTop: 8,
                  minHeight: 44,
                }}
              >
                Booking Sekarang <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <Konsultasi embedded defaultMode="complaint" />
            </div>
          )}
        </div>
      </div>
      )}

      {/* Service sheet */}
      <Sheet open={openSheet === "service"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-0 flex flex-col gap-0">
          <SheetHeader className="p-4 pb-2 shrink-0 border-b border-border">
            <SheetTitle>Pilih layanan</SheetTitle>
            <p className="text-xs text-muted-foreground text-left">Tampilan katalog — ketuk kartu untuk memilih.</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1 py-4">Memuat layanan…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {services.map((s, i) => {
                  const Icon = SERVICE_ICON_MAP[s.icon] || Wrench;
                  const gradient = SERVICE_CATEGORY_GRADIENT[s.category] ?? "from-primary/20 to-primary/5";
                  const catLabel = SERVICE_CATEGORY_LABEL[s.category] ?? s.category;
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                      className={cn(
                        "group relative flex flex-col items-center justify-center text-center rounded-2xl p-3 overflow-hidden transition-all duration-300 active:scale-[0.97] animate-scale-in",
                        active
                          ? "bg-primary/10 border-2 border-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
                          : "bg-card border border-border hover:border-primary/60 hover:-translate-y-0.5"
                      )}
                    >
                      <div
                        aria-hidden
                        className={cn(
                          "absolute inset-0 bg-gradient-to-br pointer-events-none transition-opacity duration-500",
                          gradient,
                          active ? "opacity-60" : "opacity-30 group-hover:opacity-60"
                        )}
                      />
                      {s.badge && (
                        <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm">
                          {s.badge}
                        </span>
                      )}
                      <div className={cn(
                        "relative z-10 h-11 w-11 rounded-2xl flex items-center justify-center mb-1.5 border shadow-sm transition-transform duration-300",
                        active
                          ? "bg-primary/20 border-primary/40 scale-110"
                          : "bg-card/80 backdrop-blur-sm border-border/60 group-hover:scale-110 group-hover:rotate-[-4deg]"
                      )}>
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="relative z-10 text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">
                        {s.name}
                      </p>
                      <p className="relative z-10 mt-0.5 text-[10px] text-muted-foreground capitalize">
                        {catLabel}
                      </p>
                      <p className="relative z-10 mt-0.5 text-[10px] font-semibold text-primary">
                        {formatIDRShort(s.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Selesai */}
          {serviceId && (
            <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm p-4">
              <Button
                onClick={() => setOpenSheet(null)}
                className="w-full gap-2"
                size="lg"
              >
                Selesai • {services.find((s) => s.id === serviceId)?.name}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
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
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0">
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4 text-primary" />
                Data Kendaraan Anda
              </SheetTitle>
            </SheetHeader>
            <p className="text-[11px] text-muted-foreground mt-1">
              Merk, tipe & tahun wajib. Yang lain opsional.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={guestBrand}
                onChange={(e) => { setGuestBrand(e.target.value); setGuestModel(""); setGuestCustomModel(""); }}
                className="bg-background border border-border rounded-xl px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              >
                <option value="">Merk *</option>
                {GUEST_BRAND_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                value={guestModel}
                onChange={(e) => setGuestModel(e.target.value)}
                disabled={!guestBrand}
                className="bg-background border border-border rounded-xl px-2.5 py-2 text-sm outline-none focus:border-primary/60 disabled:opacity-60"
              >
                <option value="">{guestBrand ? "Tipe *" : "Pilih merk dulu"}</option>
                {(GUEST_BRAND_MODELS[guestBrand] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                {guestBrand && guestBrand !== "Lainnya" && <option value="Lainnya">Lainnya / tulis sendiri…</option>}
              </select>
              <select
                value={guestYear}
                onChange={(e) => setGuestYear(e.target.value)}
                className="bg-background border border-border rounded-xl px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              >
                <option value="">Tahun *</option>
                {GUEST_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                value={guestTransmission}
                onChange={(e) => setGuestTransmission(e.target.value)}
                className="bg-background border border-border rounded-xl px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              >
                <option value="">Transmisi</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
                <option value="CVT">CVT</option>
              </select>
              <input
                value={guestMileage}
                onChange={(e) => setGuestMileage(e.target.value.replace(/\D/g, ""))}
                placeholder="Kilometer (opsional)"
                inputMode="numeric"
                className="bg-background border border-border rounded-xl px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              />
              <input
                value={guestPlate}
                onChange={(e) => setGuestPlate(e.target.value.toUpperCase())}
                placeholder="Plat nomor (opsional)"
                className="bg-background border border-border rounded-xl px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>

            {guestModel === "Lainnya" && (
              <input
                value={guestCustomModel}
                onChange={(e) => setGuestCustomModel(e.target.value)}
                placeholder="Tulis tipe mobil (mis. Sienta) *"
                className="mt-2 w-full bg-background border border-border rounded-xl px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              />
            )}
          </div>

          {/* Sticky done bar */}
          <div className="border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={() => setOpenSheet(null)}
              disabled={!guestVehicleValid}
              className="w-full h-11 text-sm font-semibold"
            >
              {guestVehicleValid ? "Selesai" : "Lengkapi merk, tipe & tahun"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Date sheet */}
      <Sheet open={openSheet === "date"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0">
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
            <SheetHeader className="text-left">
              <SheetTitle className="text-base">Jadwal & Cabang</SheetTitle>
            </SheetHeader>

            {/* Date strip */}
            <div className="mt-3">
              <SectionLabel icon={CalendarDays}>Tanggal</SectionLabel>
              <div
                className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
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
                        "snap-start shrink-0 w-[54px] h-[64px] rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95",
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_3px_10px_-3px_hsl(var(--primary)/0.55)]"
                          : "bg-card border-border/60 text-foreground"
                      )}
                    >
                      <span className={cn("text-[9px] uppercase font-semibold", active ? "opacity-90" : "text-muted-foreground")}>
                        {format(d, "EEE", { locale: idLocale })}
                      </span>
                      <span className="text-base font-bold leading-tight">{format(d, "d")}</span>
                      <span className={cn("text-[9px]", active ? "opacity-90" : "text-muted-foreground")}>
                        {isToday ? "Hari ini" : format(d, "MMM", { locale: idLocale })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time chips */}
            {date && (
              <div className="mt-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="flex items-center justify-between">
                  <SectionLabel icon={Clock}>Jam</SectionLabel>
                  {isSameLocalDay(date, now) && (
                    <span className="text-[10px] text-primary mb-1.5">+30 mnt</span>
                  )}
                </div>
                {availableSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Slot habis hari ini. Pilih tanggal lain.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={cn(
                          "h-9 rounded-lg border text-xs font-semibold transition-all",
                          time === slot
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_6px_-2px_hsl(var(--primary)/0.5)]"
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
            <div className="mt-3">
              <SectionLabel icon={MapPin}>Cabang</SectionLabel>
              <div className="grid grid-cols-2 gap-1.5">
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
                <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
                  Pilih tanggal dulu untuk lihat slot tiap cabang.
                </p>
              )}
            </div>
          </div>

          {/* Sticky done bar */}
          <div className="border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={() => setOpenSheet(null)}
              disabled={!date || !time || !branchId}
              className="w-full h-11 text-sm font-semibold"
            >
              {!date || !time || !branchId
                ? "Lengkapi tanggal, jam & cabang"
                : "Selesai"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

const SectionLabel = ({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 mb-1.5 px-0.5 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
    <Icon className="h-3 w-3" /> {children}
  </div>
);

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

  const dotColor = isFull
    ? "bg-destructive"
    : totals.remaining !== null && totals.remaining <= 2
      ? "bg-amber-500"
      : "bg-emerald-500";

  const card = (
    <button
      type="button"
      onClick={onSelect}
      disabled={isFull}
      aria-disabled={isFull}
      className={cn(
        "relative w-full px-2.5 py-2 rounded-xl border text-left transition",
        isFull
          ? "border-border/60 bg-muted/40 opacity-60 cursor-not-allowed"
          : active
            ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_10px_-3px_hsl(var(--primary)/0.55)]"
            : "border-border hover:bg-muted active:scale-[0.98]"
      )}
    >
      <span className="flex items-center gap-1.5">
        {showStatus && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />}
        <span className={cn(
          "text-[12px] font-semibold truncate flex-1",
          active && !isFull ? "text-primary-foreground" : "text-foreground"
        )}>{branch.city}</span>
        {isFull && <Info className="h-3 w-3 text-destructive shrink-0" />}
      </span>
      <span className={cn(
        "block text-[10px] mt-0.5",
        active && !isFull ? "text-primary-foreground/85" : "text-muted-foreground"
      )}>
        {!date
          ? "—"
          : !showStatus
            ? "memuat…"
            : isFull
              ? "Penuh"
              : `${totals.remaining}/${totals.total} slot`}
      </span>
    </button>
  );

  if (!isFull) return card;

  return (
    <Popover>
      <PopoverTrigger asChild>{card}</PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-60 p-3 text-xs leading-relaxed">
        <p className="font-semibold text-foreground mb-1">Slot {branch.city} penuh 🙏</p>
        <p className="text-muted-foreground">
          Wah, ramai sekali hari ini! Coba pilih tanggal lain atau cabang terdekat — tim kami siap melayani Anda.
        </p>
      </PopoverContent>
    </Popover>
  );
};

const FieldRow = ({
  icon: Icon, label, value, onClick,
}: {
  icon: typeof Wrench; label: string; value: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 hover:bg-muted/40 active:scale-[0.99] transition text-left"
    style={{ padding: "8px 10px", minHeight: 44 }}
  >
    <span
      className="bg-primary/10 text-primary flex items-center justify-center shrink-0"
      style={{ width: 30, height: 30, borderRadius: 8 }}
    >
      <Icon style={{ width: 14, height: 14 }} />
    </span>
    <span className="min-w-0 flex-1">
      <span
        className="block uppercase text-muted-foreground leading-none"
        style={{ fontSize: 9, letterSpacing: "0.06em", fontWeight: 600 }}
      >
        {label}
      </span>
      <span
        className="block text-foreground truncate"
        style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}
      >
        {value}
      </span>
    </span>
    <ChevronDown className="text-muted-foreground shrink-0" style={{ width: 14, height: 14 }} />
  </button>
);

export default HeroBookingForm;
