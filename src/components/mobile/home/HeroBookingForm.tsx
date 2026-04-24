import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Wrench, Car, CalendarDays, ArrowRight, ChevronDown, Search, Plus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filterFutureSlots, isSameLocalDay, TIME_TICK_MS } from "@/lib/timeSlots";
import heroImg from "@/assets/hero-garage.jpg";

type ServiceOpt = { id: string; name: string };
type VehicleOpt = { id: string; label: string };

// Dummy popular Indonesian car models for guest selection
const DUMMY_VEHICLES: VehicleOpt[] = [
  { id: "dummy-avanza", label: "Toyota Avanza" },
  { id: "dummy-innova", label: "Toyota Innova" },
  { id: "dummy-fortuner", label: "Toyota Fortuner" },
  { id: "dummy-rush", label: "Toyota Rush" },
  { id: "dummy-yaris", label: "Toyota Yaris" },
  { id: "dummy-xenia", label: "Daihatsu Xenia" },
  { id: "dummy-terios", label: "Daihatsu Terios" },
  { id: "dummy-ayla", label: "Daihatsu Ayla" },
  { id: "dummy-sigra", label: "Daihatsu Sigra" },
  { id: "dummy-brio", label: "Honda Brio" },
  { id: "dummy-mobilio", label: "Honda Mobilio" },
  { id: "dummy-jazz", label: "Honda Jazz" },
  { id: "dummy-hrv", label: "Honda HR-V" },
  { id: "dummy-crv", label: "Honda CR-V" },
  { id: "dummy-civic", label: "Honda Civic" },
  { id: "dummy-ertiga", label: "Suzuki Ertiga" },
  { id: "dummy-xl7", label: "Suzuki XL7" },
  { id: "dummy-baleno", label: "Suzuki Baleno" },
  { id: "dummy-ignis", label: "Suzuki Ignis" },
  { id: "dummy-livina", label: "Nissan Livina" },
  { id: "dummy-xtrail", label: "Nissan X-Trail" },
  { id: "dummy-pajero", label: "Mitsubishi Pajero Sport" },
  { id: "dummy-xpander", label: "Mitsubishi Xpander" },
  { id: "dummy-wuling", label: "Wuling Confero" },
  { id: "dummy-almaz", label: "Wuling Almaz" },
];

const HeroBookingForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();

  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const [openSheet, setOpenSheet] = useState<null | "service" | "vehicle" | "date">(null);
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

  // Reset selected time if it's no longer available (e.g. clock ticks past it)
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
  const vehicleSource = user ? vehicles : DUMMY_VEHICLES;
  const vehicleLabel = useMemo(() => {
    const found = vehicleSource.find((v) => v.id === vehicleId)?.label;
    if (found) return found;
    return user ? "Pilih kendaraan" : "Pilih tipe mobil";
  }, [vehicleSource, vehicleId, user]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicleSource;
    return vehicleSource.filter((v) => v.label.toLowerCase().includes(q));
  }, [vehicleSource, vehicleSearch]);
  const dateLabel = date
    ? `${format(date, "EEE, d MMM", { locale: idLocale })}${time ? ` • ${time}` : ""}`
    : "Pilih tanggal & jam";

  const handleBook = () => {
    if (!user) { openLoginDialog("/booking"); return; }
    const params = new URLSearchParams();
    if (serviceId) params.set("service", serviceId);
    if (vehicleId && !vehicleId.startsWith("dummy-")) params.set("vehicle", vehicleId);
    // For guest dummy vehicles, pass the car label as carType so wizard can pre-fill
    if (vehicleId && vehicleId.startsWith("dummy-")) {
      const dummy = vehicleSource.find((v) => v.id === vehicleId);
      if (dummy) params.set("carType", dummy.label);
    }
    if (date) params.set("date", format(date, "yyyy-MM-dd"));
    // Pass selected time (or first available slot as default) so wizard can jump to confirmation
    const slot = time || availableSlots[0];
    if (date && slot) params.set("time", slot);
    navigate(`/booking${params.toString() ? `?${params.toString()}` : ""}`);
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
            onClick={() => setOpenSheet("vehicle")}
          />
          <FieldRow
            icon={CalendarDays}
            label="Tanggal"
            value={dateLabel}
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

      {/* Vehicle sheet */}
      <Sheet open={openSheet === "vehicle"} onOpenChange={(o) => { if (!o) { setOpenSheet(null); setVehicleSearch(""); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{user ? "Pilih kendaraan" : "Pilih tipe mobil"}</SheetTitle>
          </SheetHeader>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder={user ? "Cari kendaraan..." : "Cari tipe mobil (mis. Avanza)"}
              className="pl-9"
            />
          </div>

          {!user && (
            <p className="mt-2 text-[11px] text-muted-foreground px-1">
              Login untuk menyimpan & memilih kendaraan Anda sendiri.
            </p>
          )}

          {user && (
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
          )}

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
            {user && vehicles.length === 0 && (
              <div className="px-1 py-4 space-y-2">
                <p className="text-sm text-muted-foreground">Belum ada kendaraan.</p>
                <Button variant="outline" className="w-full" onClick={() => { setOpenSheet(null); navigate("/my-vehicles"); }}>
                  Tambah Kendaraan
                </Button>
              </div>
            )}
            {filteredVehicles.length === 0 && (user ? vehicles.length > 0 : true) && (
              <p className="text-sm text-muted-foreground px-1 py-4 text-center">
                Tidak ada hasil untuk "{vehicleSearch}"
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Date sheet */}
      <Sheet open={openSheet === "date"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Pilih tanggal</SheetTitle></SheetHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { setDate(d); if (d) setOpenSheet(null); }}
              disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        </SheetContent>
      </Sheet>
    </section>
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