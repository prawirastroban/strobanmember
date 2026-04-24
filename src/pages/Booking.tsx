import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowLeft, ArrowRight, Check, Clock, Loader2, Search, ShieldAlert,
  Wrench, Car, CalendarDays, Tag, Sparkles, Plus, Info,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import RedemptionCodeInput from "@/components/booking/RedemptionCodeInput";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserVerification } from "@/hooks/useUserVerification";
import { filterFutureSlots, isSameLocalDay, TIME_TICK_MS } from "@/lib/timeSlots";
import { cn } from "@/lib/utils";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
}
interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string;
  is_default: boolean;
}
interface RedemptionData {
  id: string;
  redemption_code: string;
  discount_type: string;
  discount_value: number;
  reward_name: string;
  expires_at: string;
}

const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const DEFAULT_BRANCH = "bandung"; // hidden from UI, auto-assigned

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);

const Booking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isVerified } = useUserVerification();

  // ───────── URL pre-selection (from /home hero form) ─────────
  const preService = searchParams.get("service");
  const preVehicle = searchParams.get("vehicle");
  const preDate = searchParams.get("date");
  const preTime = searchParams.get("time");
  const preCarType = searchParams.get("carType");

  // ───────── Data ─────────
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // ───────── Selections ─────────
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    preService ? [preService] : []
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(preVehicle);
  const [carType, setCarType] = useState(preCarType || "");
  const [carPlate, setCarPlate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (!preDate) return undefined;
    const d = new Date(preDate);
    return isNaN(d.getTime()) ? undefined : d;
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(preTime || null);

  // ───────── UI ─────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [now, setNow] = useState(new Date());
  const [appliedRedemption, setAppliedRedemption] = useState<RedemptionData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const upsellShownRef = useRef(false);
  const [infoService, setInfoService] = useState<ServiceItem | null>(null);

  // ───────── Effects: live clock ─────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(t);
  }, []);

  // ───────── Load services ─────────
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,description,category,price,duration")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!alive) return;
      if (error) toast.error("Gagal memuat layanan");
      else setServices(data || []);
      setServicesLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // ───────── Load user vehicles ─────────
  useEffect(() => {
    if (!user) { setVehiclesLoading(false); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id,brand,model,year,license_plate,is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      if (!alive) return;
      const list = (data || []) as VehicleRow[];
      setVehicles(list);
      // auto-pick: URL pre-selection wins, else default vehicle, else first
      const fromUrl = preVehicle ? list.find((v) => v.id === preVehicle) : null;
      const pick = fromUrl || list.find((v) => v.is_default) || list[0];
      if (pick) {
        setSelectedVehicleId(pick.id);
        setCarType(`${pick.brand} ${pick.model}${pick.year ? ` (${pick.year})` : ""}`);
        setCarPlate(pick.license_plate);
      }
      setVehiclesLoading(false);
    })();
    return () => { alive = false; };
  }, [user, preVehicle]);

  // ───────── Derived ─────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.category));
    return ["all", ...Array.from(set)];
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      const okCat = selectedCategory === "all" || s.category === selectedCategory;
      const okQ = !q || s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [services, searchQuery, selectedCategory]);

  const selectedServices = useMemo(
    () => selectedServiceIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is ServiceItem => !!s),
    [services, selectedServiceIds]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0),
    [selectedServices]
  );

  const priceInfo = useMemo(() => {
    const original = selectedServices.reduce((sum, s) => sum + s.price, 0);
    if (original === 0) return { original: 0, final: 0, discount: 0 };
    if (!appliedRedemption) return { original, final: original, discount: 0 };
    let discount = 0;
    if (appliedRedemption.discount_type === "percentage") {
      discount = original * (appliedRedemption.discount_value / 100);
    } else {
      discount = Math.min(appliedRedemption.discount_value, original);
    }
    return { original, final: Math.max(0, original - discount), discount };
  }, [selectedServices, appliedRedemption]);

  const availableSlots = useMemo(
    () => filterFutureSlots(TIME_SLOTS, selectedDate ?? null, now),
    [selectedDate, now]
  );

  // Drop selectedTime if it falls out of available list
  useEffect(() => {
    if (selectedTime && !availableSlots.includes(selectedTime)) setSelectedTime(null);
  }, [availableSlots, selectedTime]);

  const hasService = selectedServices.length > 0;
  const hasVehicle = !!carType.trim() && !!carPlate.trim();
  const hasSchedule = !!selectedDate && !!selectedTime;
  const isComplete = hasService && hasVehicle && hasSchedule;

  // Show upsell once everything is filled — AI-suggest more services
  useEffect(() => {
    if (isComplete && !upsellShownRef.current && selectedServices.length === 1) {
      upsellShownRef.current = true;
      setShowUpsell(true);
    }
  }, [isComplete, selectedServices.length]);

  // ───────── Helpers ─────────
  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const pickVehicle = (v: VehicleRow) => {
    setSelectedVehicleId(v.id);
    setCarType(`${v.brand} ${v.model}${v.year ? ` (${v.year})` : ""}`);
    setCarPlate(v.license_plate);
  };

  const submitBooking = async (payLater: boolean) => {
    if (!user) { toast.error("Silakan masuk dulu"); return; }
    if (isVerified === false) { toast.error("Akun belum diverifikasi"); return; }
    if (!isComplete) { toast.error("Lengkapi semua data dulu"); return; }

    setIsSubmitting(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    const combinedName = selectedServices.map((s) => s.name).join(" + ");
    const combinedType = selectedServiceIds.join(",");

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        vehicle_id: selectedVehicleId,
        customer_name: profile?.full_name || user.email?.split("@")[0] || "Customer",
        customer_email: user.email || "",
        customer_phone: profile?.phone || "",
        service_type: combinedType,
        service_name: combinedName,
        service_price: priceInfo.final,
        service_duration: totalDuration || 60,
        booking_date: format(selectedDate!, "yyyy-MM-dd"),
        booking_time: selectedTime!,
        status: payLater ? "waiting_confirmation" : "pending",
        payment_status: payLater ? "pay_later" : "unpaid",
        car_type: carType.trim(),
        car_plate_number: carPlate.trim(),
        branch: DEFAULT_BRANCH,
      })
      .select("id")
      .single();

    if (error || !booking) {
      setIsSubmitting(false);
      toast.error("Gagal membuat booking", { description: error?.message });
      return;
    }

    if (appliedRedemption) {
      await supabase
        .from("reward_redemptions")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", appliedRedemption.id);
    }

    setIsSubmitting(false);
    if (payLater) {
      toast.success("Booking dibuat — bayar di tempat saat datang");
      navigate(`/my-booking/${booking.id}`);
    } else {
      toast.success("Booking berhasil");
      navigate(`/my-booking/${booking.id}?pay=1`, { replace: true });
    }
  };

  // Suggested upsell list = popular categories the user hasn't picked
  const upsellSuggestions = useMemo(() => {
    return services
      .filter((s) => !selectedServiceIds.includes(s.id))
      .slice(0, 4);
  }, [services, selectedServiceIds]);

  // ───────── Render ─────────
  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Navbar />

      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
          <div className="flex-1">
            <h1 className="text-base md:text-lg font-bold leading-tight">Booking Servis</h1>
            <p className="text-[11px] md:text-xs text-muted-foreground">
              Pilih layanan, kendaraan & jadwal — semua di satu halaman.
            </p>
          </div>
        </div>
      </header>

      {isVerified === false && (
        <div className="container mx-auto px-4 pt-3">
          <Alert className="border-destructive/40 bg-destructive/10">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive text-xs">
              Akun Anda menunggu verifikasi admin. Booking belum dapat dilakukan.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <main className="container mx-auto px-4 py-4 md:py-6 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* ───────── Left: Services ───────── */}
        <section className="lg:col-span-2 space-y-3">
          <SectionHeader
            icon={Wrench}
            title="Pilih Layanan"
            subtitle={`${selectedServices.length} dipilih`}
          />

          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari layanan…"
                  className="pl-9 h-10 rounded-xl bg-muted/40 border-border/60"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 h-9 rounded-full text-xs font-medium whitespace-nowrap capitalize transition-all flex-shrink-0",
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground shadow-[0_2px_6px_-2px_hsl(var(--primary)/0.5)]"
                        : "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    {cat === "all" ? "Semua" : cat}
                  </button>
                ))}
              </div>
            </div>

            {servicesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada layanan.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredServices.map((s) => {
                  const isSel = selectedServiceIds.includes(s.id);
                  const idx = selectedServiceIds.indexOf(s.id);
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "relative rounded-2xl border bg-card transition-all overflow-hidden",
                        isSel
                          ? "border-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.45)] bg-primary/5"
                          : "border-border/70"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setInfoService(s); }}
                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-muted-foreground active:scale-90 transition z-10"
                        aria-label="Info layanan"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className="w-full text-left p-3 active:scale-[0.98] transition-transform"
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center mb-2 transition-colors",
                          isSel ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                        )}>
                          {isSel ? (
                            <span className="text-[12px] font-bold">{idx + 1}</span>
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                        </div>
                        <h3 className="font-semibold text-[13px] leading-tight line-clamp-2 mb-1.5 pr-6 min-h-[32px]">
                          {s.name}
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                          <Clock className="h-3 w-3" /> {s.duration} mnt
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                          <span className="text-[13px] font-bold text-primary truncate">
                            {formatIDR(s.price)}
                          </span>
                          {isSel && (
                            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ───────── Right: Vehicle + Schedule + Summary ───────── */}
        <aside className="space-y-4">
          {/* Vehicle */}
          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-2.5">
            <SectionHeader icon={Car} title="Kendaraan" />
            {vehiclesLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat kendaraan…
              </div>
            ) : vehicles.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate("/my-vehicles")}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition text-left"
              >
                <span className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">Tambah Kendaraan</span>
                  <span className="block text-[11px] text-muted-foreground">Diperlukan untuk booking</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                {vehicles.map((v) => {
                  const active = selectedVehicleId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => pickVehicle(v)}
                      className={cn(
                        "shrink-0 w-[160px] text-left rounded-2xl border p-2.5 transition-all",
                        active
                          ? "border-primary bg-primary/5 shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.45)]"
                          : "border-border/70 bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Car className="h-3.5 w-3.5" />
                        </div>
                        {active && (
                          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-[12.5px] font-semibold leading-tight line-clamp-1">
                        {v.brand} {v.model}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase">
                        {v.license_plate}
                      </p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => navigate("/my-vehicles")}
                  className="shrink-0 w-[100px] rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-1 text-muted-foreground active:scale-[0.98] transition py-3"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[11px] font-medium">Tambah</span>
                </button>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-3">
            <SectionHeader icon={CalendarDays} title="Jadwal" />

            {/* Date strip - next 14 days */}
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
              {Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + i);
                const active = selectedDate && isSameLocalDay(d, selectedDate);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      "shrink-0 w-14 py-2 rounded-xl border text-center transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_3px_10px_-3px_hsl(var(--primary)/0.55)]"
                        : "bg-card border-border/60 active:scale-95"
                    )}
                  >
                    <p className="text-[10px] font-medium opacity-80 leading-none">
                      {i === 0 ? "Hari ini" : d.toLocaleDateString("id-ID", { weekday: "short" })}
                    </p>
                    <p className="text-base font-bold leading-tight mt-1">{d.getDate()}</p>
                    <p className="text-[10px] opacity-70 leading-none">
                      {d.toLocaleDateString("id-ID", { month: "short" })}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Jam</span>
                  {isSameLocalDay(selectedDate, now) && (
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
                        onClick={() => setSelectedTime(slot)}
                        className={cn(
                          "h-10 rounded-xl border text-[12px] font-semibold transition-all",
                          selectedTime === slot
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
          </div>

          {/* Redemption + Summary */}
          {hasService && (
            <RedemptionCodeInput
              userId={user?.id}
              onRedemptionApplied={setAppliedRedemption}
              appliedRedemption={appliedRedemption}
            />
          )}

          {hasService && (
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              {priceInfo.discount > 0 && (
                <>
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>Harga normal</span>
                    <span className="line-through">{formatIDR(priceInfo.original)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-primary mt-1">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Diskon</span>
                    <span>− {formatIDR(priceInfo.discount)}</span>
                  </div>
                  <div className="border-t border-border/50 my-2.5" />
                </>
              )}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Total</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {totalDuration} mnt • {selectedServices.length} layanan
                  </p>
                </div>
                <span className="text-2xl font-bold text-primary leading-none">
                  {formatIDR(priceInfo.final)}
                </span>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="container mx-auto px-3 py-3">
          {!isComplete ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-[11px] text-muted-foreground">
                {!hasService && "Pilih minimal 1 layanan."}
                {hasService && !hasVehicle && "Pilih kendaraan."}
                {hasService && hasVehicle && !hasSchedule && "Pilih tanggal & jam."}
              </div>
              <Button disabled className="h-11 rounded-xl px-6">
                Lanjut <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => submitBooking(true)}
                disabled={isSubmitting || isVerified === false}
                className="h-12 rounded-xl text-sm font-semibold"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bayar di Tempat"}
              </Button>
              <Button
                onClick={() => submitBooking(false)}
                disabled={isSubmitting || isVerified === false}
                className="h-12 rounded-xl text-sm font-semibold"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bayar Sekarang"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Service info popup */}
      <Dialog open={!!infoService} onOpenChange={(o) => !o && setInfoService(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border">
          <DialogHeader className="px-5 pt-5 pb-2 text-left">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-[16px] font-bold leading-tight">
                  {infoService?.name}
                </DialogTitle>
                <DialogDescription className="text-[11px] capitalize mt-0.5">
                  {infoService?.category}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-5 pb-4 space-y-3">
            {infoService?.description && (
              <p className="text-[13px] leading-relaxed text-foreground/80">
                {infoService.description}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Durasi</p>
                <p className="text-sm font-bold mt-1.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {infoService?.duration} mnt
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <p className="text-[10px] uppercase tracking-wide text-primary/80 leading-none">Harga</p>
                <p className="text-sm font-bold text-primary mt-1.5">
                  {infoService ? formatIDR(infoService.price) : "-"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="px-5 pb-5 pt-1 flex-row gap-2">
            <Button variant="outline" onClick={() => setInfoService(null)} className="flex-1 rounded-xl">
              Tutup
            </Button>
            <Button
              onClick={() => {
                if (infoService && !selectedServiceIds.includes(infoService.id)) {
                  toggleService(infoService.id);
                }
                setInfoService(null);
              }}
              className="flex-1 rounded-xl"
            >
              {infoService && selectedServiceIds.includes(infoService.id) ? "Sudah Dipilih" : "Pilih"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upsell dialog — appears once after first complete fill */}
      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-5 pt-5 pb-2 text-left">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-[16px] font-bold leading-tight">
                  Sekalian, mau tambah layanan lain?
                </DialogTitle>
                <DialogDescription className="text-[12px] mt-1">
                  Tanpa biaya admin tambahan — lebih hemat & sekali datang.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-5 pb-3 space-y-2">
            {upsellSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                Tidak ada saran lain saat ini.
              </p>
            ) : (
              upsellSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { toggleService(s.id); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition",
                    selectedServiceIds.includes(s.id)
                      ? "border-primary bg-primary/5"
                      : "border-border/70 hover:bg-muted/40"
                  )}
                >
                  <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold truncate">{s.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {s.duration} mnt • {formatIDR(s.price)}
                    </span>
                  </span>
                  {selectedServiceIds.includes(s.id) ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
          <DialogFooter className="px-5 pb-5 pt-2">
            <Button onClick={() => setShowUpsell(false)} className="w-full rounded-xl h-11">
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SectionHeader = ({
  icon: Icon, title, subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-center justify-between px-1">
    <div className="flex items-center gap-2">
      <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h2 className="text-[13px] font-bold tracking-tight">{title}</h2>
    </div>
    {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
  </div>
);

export default Booking;