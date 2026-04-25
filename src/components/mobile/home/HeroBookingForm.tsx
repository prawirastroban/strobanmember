import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Wrench, Car, CalendarDays, ArrowRight, ChevronDown, Search, Plus, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { filterFutureSlots, isSameLocalDay, TIME_TICK_MS } from "@/lib/timeSlots";
import heroImg from "@/assets/hero-garage.jpg";

type ServiceOpt = { id: string; name: string };
type VehicleOpt = { id: string; label: string; brand?: string; model?: string };
type BranchOpt  = { id: string; name: string; city: string };

const BRANCHES: BranchOpt[] = [
  { id: "bandung",     name: "Bengkel Stroban Bandung",     city: "Bandung" },
  { id: "tasikmalaya", name: "Bengkel Stroban Tasikmalaya", city: "Tasikmalaya" },
  { id: "cirebon",     name: "Bengkel Stroban Cirebon",     city: "Cirebon" },
  { id: "yogyakarta",  name: "Bengkel Stroban Yogyakarta",  city: "Yogyakarta" },
];

// Dummy brand → model catalog for guest selection
const BRAND_MODELS: Record<string, string[]> = {
  Toyota:     ["Avanza", "Innova", "Fortuner", "Rush", "Yaris", "Calya", "Agya", "Veloz", "Raize", "Hilux", "Camry", "Corolla Altis"],
  Daihatsu:   ["Xenia", "Terios", "Ayla", "Sigra", "Rocky", "Gran Max", "Luxio", "Sirion"],
  Honda:      ["Brio", "Mobilio", "Jazz", "HR-V", "CR-V", "Civic", "City", "BR-V", "WR-V", "Accord"],
  Suzuki:     ["Ertiga", "XL7", "Baleno", "Ignis", "Carry", "Swift", "S-Presso", "Jimny"],
  Mitsubishi: ["Pajero Sport", "Xpander", "Xpander Cross", "Outlander", "Triton", "Mirage"],
  Nissan:     ["Livina", "X-Trail", "Serena", "Magnite", "Kicks"],
  Wuling:     ["Confero", "Almaz", "Cortez", "Air EV", "Alvez"],
  Mazda:      ["CX-5", "CX-3", "CX-30", "Mazda 2", "Mazda 3", "Biante"],
  Hyundai:    ["Stargazer", "Creta", "Santa Fe", "Ioniq 5", "Palisade"],
  KIA:        ["Sonet", "Seltos", "Carnival", "Sportage"],
  BMW:        ["320i", "520i", "X1", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC", "GLE"],
  Lainnya:    ["Lainnya"],
};
const BRAND_OPTIONS = Object.keys(BRAND_MODELS);

// Year options: current year down to 2005
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2004 }, (_, i) => CURRENT_YEAR - i);

const HeroBookingForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { toast } = useToast();

  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const [openSheet, setOpenSheet] = useState<null | "service" | "vehicle" | "date">(null);
  const [vehicleSearch, setVehicleSearch] = useState("");

  // Guest dummy-vehicle detail capture
  const [guestDetailOpen, setGuestDetailOpen] = useState(false);
  const [guestForm, setGuestForm] = useState({
    brand: "",
    model: "",
    customModel: "",
    year: "",
    transmission: "",
    mileage: "",
    complaint: "",
    name: "",
    phone: "",
  });
  const [savingGuest, setSavingGuest] = useState(false);

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
  const vehicleSource = user ? vehicles : [];
  const vehicleLabel = useMemo(() => {
    if (!user) {
      const m = guestForm.model === "Lainnya" ? guestForm.customModel : guestForm.model;
      if (guestForm.brand && m) {
        return `${guestForm.brand} ${m}${guestForm.year ? ` ${guestForm.year}` : ""}`;
      }
      return "Pilih tipe mobil";
    }
    const found = vehicleSource.find((v) => v.id === vehicleId);
    return found?.label ?? "Pilih kendaraan";
  }, [vehicleSource, vehicleId, user, guestForm]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicleSource;
    return vehicleSource.filter((v) => v.label.toLowerCase().includes(q));
  }, [vehicleSource, vehicleSearch]);
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
    if (vehicleId && !vehicleId.startsWith("dummy-")) params.set("vehicle", vehicleId);
    // For guest dummy vehicles, pass the car label as carType so wizard can pre-fill
    if (vehicleId && vehicleId.startsWith("dummy-")) {
      const dummy = vehicleSource.find((v) => v.id === vehicleId);
      if (dummy) params.set("carType", dummy.label);
    }
    if (branchId) params.set("branch", branchId);
    if (date) params.set("date", format(date, "yyyy-MM-dd"));
    // Pass selected time (or first available slot as default) so wizard can jump to confirmation
    const slot = time || availableSlots[0];
    if (date && slot) params.set("time", slot);
    navigate(`/booking${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const submitGuestDetail = async () => {
    const finalModel = guestForm.model === "Lainnya"
      ? guestForm.customModel.trim()
      : guestForm.model;

    if (!guestForm.brand) {
      toast({ variant: "destructive", title: "Pilih merk kendaraan" }); return;
    }
    if (!finalModel) {
      toast({ variant: "destructive", title: "Pilih atau tulis tipe kendaraan" }); return;
    }
    if (!guestForm.year) {
      toast({ variant: "destructive", title: "Tahun kendaraan wajib diisi" }); return;
    }
    if (!guestForm.complaint.trim()) {
      toast({ variant: "destructive", title: "Mohon tuliskan keluhan singkat" }); return;
    }
    setSavingGuest(true);
    const { error } = await supabase.from("vehicle_complaints").insert({
      user_id: null,
      customer_name: guestForm.name.trim() || null,
      customer_phone: guestForm.phone.trim() || null,
      vehicle_brand: guestForm.brand,
      vehicle_model: finalModel,
      vehicle_year: parseInt(guestForm.year, 10),
      vehicle_transmission: guestForm.transmission || null,
      vehicle_mileage: guestForm.mileage ? parseInt(guestForm.mileage, 10) : null,
      complaint: guestForm.complaint.trim(),
      status: "new",
      recommended_service_ids: [],
    });
    setSavingGuest(false);
    if (error) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: error.message });
      return;
    }
    toast({
      title: "Terima kasih! 🙏",
      description: "Keluhan Anda terkirim ke tim kami. Login untuk lanjut booking.",
    });
    setVehicleId(`guest-${guestForm.brand}-${finalModel}`.toLowerCase().replace(/\s+/g, "-"));
    setGuestDetailOpen(false);
  };

  // Open guest dialog directly when guest taps the "Kendaraan" field
  const handleVehicleFieldClick = () => {
    if (!user) { setGuestDetailOpen(true); return; }
    setOpenSheet("vehicle");
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
          <SheetHeader>
            <SheetTitle>Pilih kendaraan</SheetTitle>
          </SheetHeader>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder="Cari kendaraan..."
              className="pl-9"
            />
          </div>

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

      {/* Guest vehicle detail + complaint dialog */}
      <Dialog open={guestDetailOpen} onOpenChange={setGuestDetailOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Data Kendaraan & Keluhan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bantu kami siapkan servis lebih cepat — isi merk, tipe, tahun mobil & keluhan singkat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Merk <span className="text-destructive">*</span></Label>
                <select
                  value={guestForm.brand}
                  onChange={(e) => setGuestForm((p) => ({ ...p, brand: e.target.value, model: "", customModel: "" }))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                >
                  <option value="">Pilih merk</option>
                  {BRAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipe <span className="text-destructive">*</span></Label>
                <select
                  value={guestForm.model}
                  onChange={(e) => setGuestForm((p) => ({ ...p, model: e.target.value }))}
                  disabled={!guestForm.brand}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm disabled:opacity-60"
                >
                  <option value="">{guestForm.brand ? "Pilih tipe" : "Pilih merk dulu"}</option>
                  {(BRAND_MODELS[guestForm.brand] ?? []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {guestForm.brand && guestForm.brand !== "Lainnya" && (
                    <option value="Lainnya">Lainnya / tulis sendiri…</option>
                  )}
                </select>
              </div>
            </div>

            {guestForm.model === "Lainnya" && (
              <div className="space-y-1">
                <Label className="text-xs">Tulis tipe mobil <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="mis. Sienta, Veloz Q, dll."
                  value={guestForm.customModel}
                  onChange={(e) => setGuestForm((p) => ({ ...p, customModel: e.target.value }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Tahun <span className="text-destructive">*</span></Label>
                <select
                  value={guestForm.year}
                  onChange={(e) => setGuestForm((p) => ({ ...p, year: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                >
                  <option value="">Pilih tahun</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transmisi</Label>
                <select
                  value={guestForm.transmission}
                  onChange={(e) => setGuestForm((p) => ({ ...p, transmission: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                >
                  <option value="">Pilih</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                  <option value="CVT">CVT</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kilometer (opsional)</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="mis. 45000"
                value={guestForm.mileage}
                onChange={(e) => setGuestForm((p) => ({ ...p, mileage: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Keluhan singkat <span className="text-destructive">*</span></Label>
              <Textarea
                rows={3}
                placeholder="mis. rem berbunyi, AC kurang dingin, mesin bergetar saat idle..."
                value={guestForm.complaint}
                onChange={(e) => setGuestForm((p) => ({ ...p, complaint: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nama (opsional)</Label>
                <Input
                  placeholder="Nama Anda"
                  value={guestForm.name}
                  onChange={(e) => setGuestForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">No. HP (opsional)</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="08xxxx"
                  value={guestForm.phone}
                  onChange={(e) => setGuestForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGuestDetailOpen(false)}>Batal</Button>
            <Button onClick={submitGuestDetail} disabled={savingGuest}>
              {savingGuest ? "Menyimpan..." : "Kirim & Pilih Mobil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date sheet */}
      <Sheet open={openSheet === "date"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Pilih jadwal & cabang</SheetTitle></SheetHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => setDate(d)}
              disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
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

          {/* Branch picker — merged into the same sheet */}
          <div className="mt-5 pt-4 px-1 pb-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Cabang
            </div>
            <div className="space-y-1.5">
              {BRANCHES.map((b) => {
                const active = b.id === branchId;
                return (
                  <button
                    key={b.id}
                    onClick={() => setBranchId(b.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-foreground truncate">{b.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{b.city}</span>
                    </span>
                  </button>
                );
              })}
            </div>
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