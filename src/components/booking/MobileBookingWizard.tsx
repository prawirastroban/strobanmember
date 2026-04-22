import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, Search, ShieldAlert, Wrench, Car, CalendarDays, FileCheck2, Info, Tag, MapPin, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserVerification } from "@/hooks/useUserVerification";
import VehicleSelector from "@/components/booking/VehicleSelector";
import RedemptionCodeInput from "@/components/booking/RedemptionCodeInput";
import PaymentDialog from "@/components/PaymentDialog";
import { cn } from "@/lib/utils";

interface RedemptionData {
  id: string;
  redemption_code: string;
  discount_type: string;
  discount_value: number;
  reward_name: string;
  expires_at: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
}

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
];

const STEPS = [
  { id: 1, label: "Layanan", icon: Wrench },
  { id: 2, label: "Kendaraan", icon: Car },
  { id: 3, label: "Jadwal", icon: CalendarDays },
  { id: 4, label: "Konfirmasi", icon: FileCheck2 },
];

const slotToMinutes = (slot: string) => {
  const [time, period] = slot.split(" ");
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
};
const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const MobileBookingWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isVerified } = useUserVerification();

  const preSelectedService = searchParams.get("service");
  const [step, setStep] = useState(1);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    preSelectedService ? [preSelectedService] : [],
  );
  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const [carType, setCarType] = useState("");
  const [carPlateNumber, setCarPlateNumber] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [branch, setBranch] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [appliedRedemption, setAppliedRedemption] = useState<RedemptionData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [lastBookingAmount, setLastBookingAmount] = useState(0);
  const [lastBookingService, setLastBookingService] = useState("");
  const [infoService, setInfoService] = useState<ServiceItem | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,description,category,price,duration")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      if (error) toast.error("Gagal memuat layanan");
      else setServices(data || []);
      setServicesLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.category));
    return ["all", ...Array.from(set)];
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      const matchCat = selectedCategory === "all" || s.category === selectedCategory;
      const matchQ = !q || s.name.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [services, searchQuery, selectedCategory]);

  const selectedServicesData = useMemo(
    () => selectedServiceIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is ServiceItem => !!s),
    [services, selectedServiceIds],
  );
  const totalDuration = useMemo(
    () => selectedServicesData.reduce((sum, s) => sum + (s.duration || 0), 0),
    [selectedServicesData],
  );
  const summaryServiceName = useMemo(
    () => selectedServicesData.length === 0
      ? "-"
      : selectedServicesData.length === 1
        ? selectedServicesData[0].name
        : `${selectedServicesData[0].name} +${selectedServicesData.length - 1} lainnya`,
    [selectedServicesData],
  );

  const BUFFER = 60;
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return TIME_SLOTS;
    if (!isSameLocalDay(selectedDate, currentTime)) return TIME_SLOTS;
    const minM = currentTime.getHours() * 60 + currentTime.getMinutes() + BUFFER;
    return TIME_SLOTS.filter((s) => slotToMinutes(s) >= minM);
  }, [selectedDate, currentTime]);

  useEffect(() => {
    if (selectedTime && !availableTimeSlots.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [availableTimeSlots, selectedTime]);

  const priceInfo = useMemo(() => {
    const original = selectedServicesData.reduce((sum, s) => sum + s.price, 0);
    if (original === 0) return { original: 0, final: 0, discount: 0 };
    if (!appliedRedemption) return { original, final: original, discount: 0 };
    let discount = 0;
    if (appliedRedemption.discount_type === "percentage") {
      discount = original * (appliedRedemption.discount_value / 100);
    } else {
      discount = Math.min(appliedRedemption.discount_value, original);
    }
    return { original, final: Math.max(0, original - discount), discount };
  }, [selectedServicesData, appliedRedemption]);

  // Step validation
  const canNext = useMemo(() => {
    if (step === 1) return selectedServiceIds.length > 0;
    if (step === 2) return !!carType.trim() && !!carPlateNumber.trim() && !!branch;
    if (step === 3) return !!selectedDate && !!selectedTime;
    return true;
  }, [step, selectedServiceIds, carType, carPlateNumber, branch, selectedDate, selectedTime]);

  const goNext = () => {
    if (!canNext) {
      const msg = step === 1 ? "Pilih layanan dulu"
        : step === 2 ? "Lengkapi data kendaraan & cabang"
        : "Pilih tanggal dan waktu";
      toast.error(msg);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };
  const goBack = () => {
    if (step === 1) navigate("/");
    else setStep((s) => Math.max(1, s - 1));
  };

  const submitBooking = async (payLater: boolean) => {
    if (selectedServicesData.length === 0 || !selectedDate || !selectedTime || !user) {
      toast.error("Data belum lengkap");
      return;
    }
    if (isVerified === false) {
      toast.error("Akun belum diverifikasi");
      return;
    }
    setIsSubmitting(true);
    const finalPrice = priceInfo.final;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle();

    const combinedServiceName = selectedServicesData.map((s) => s.name).join(" + ");
    const combinedServiceType = selectedServiceIds.join(",");
    const combinedDuration = totalDuration || 60;

    const { data: bookingData, error } = await supabase.from('bookings').insert({
      user_id: user.id,
      vehicle_id: selectedVehicleId,
      customer_name: profile?.full_name || user.email?.split('@')[0] || 'Customer',
      customer_email: user.email || '',
      customer_phone: profile?.phone || '',
      service_type: combinedServiceType,
      service_name: combinedServiceName,
      service_price: finalPrice,
      service_duration: combinedDuration,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      booking_time: selectedTime,
      status: payLater ? 'waiting_confirmation' : 'pending',
      payment_status: payLater ? 'pay_later' : 'unpaid',
      car_type: carType.trim(),
      car_plate_number: carPlateNumber.trim(),
      branch,
    }).select("id").single();

    if (error) {
      toast.error("Gagal membuat booking", { description: error.message });
      setIsSubmitting(false);
      return;
    }

    if (appliedRedemption) {
      await supabase
        .from('reward_redemptions')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('id', appliedRedemption.id);
    }

    setIsSubmitting(false);
    if (payLater && bookingData) {
      toast.success("Booking dibuat — bayar di tempat saat datang");
      navigate(`/my-booking/${bookingData.id}`);
      return;
    }
    if (bookingData) {
      toast.success("Booking berhasil");
      navigate(`/my-booking/${bookingData.id}?pay=1`, { replace: true });
    }
  };

  const stepProgress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-28">
      {/* Sticky compact header — Apple-style */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="flex items-center gap-2 px-3 h-12">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 -ml-1 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
              Langkah {step}/{STEPS.length}
            </div>
            <div className="text-[15px] font-semibold leading-tight mt-0.5 truncate">
              {STEPS[step - 1].label}
            </div>
          </div>
          {/* Compact pill step rail */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "h-7 rounded-full flex items-center justify-center transition-all",
                    isActive
                      ? "w-12 bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.6)]"
                      : isDone
                        ? "w-7 bg-primary/15 text-primary"
                        : "w-7 bg-muted text-muted-foreground/60",
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="h-0.5 bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
            style={{ width: `${stepProgress}%` }}
          />
        </div>
      </header>

      {/* Verification alert */}
      {isVerified === false && (
        <div className="px-3 pt-3">
          <Alert className="border-destructive/40 bg-destructive/10">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive text-xs">
              Akun menunggu verifikasi admin.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step content */}
      <main className="flex-1 px-3 py-4 animate-in fade-in slide-in-from-right-2 duration-300" key={step}>
        {step === 1 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari layanan..."
                className="pl-9 h-10 rounded-xl bg-muted/40 border-border/60"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 h-7 rounded-full text-xs font-medium whitespace-nowrap capitalize transition-all flex-shrink-0",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-[0_2px_6px_-2px_hsl(var(--primary)/0.5)]"
                      : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {cat === "all" ? "Semua" : cat}
                </button>
              ))}
            </div>

            {servicesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada layanan.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredServices.map((s) => {
                  const isSel = selectedServiceIds.includes(s.id);
                  const selIndex = selectedServiceIds.indexOf(s.id);
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
                          isSel
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        )}>
                          {isSel ? (
                            <span className="text-[12px] font-bold">{selIndex + 1}</span>
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
        )}

        {step === 2 && (
          <div className="space-y-3">
            <VehicleSelector
              carType={carType}
              carPlateNumber={carPlateNumber}
              branch={branch}
              onCarTypeChange={setCarType}
              onCarPlateNumberChange={setCarPlateNumber}
              onBranchChange={setBranch}
              onVehicleSelected={(v) => setSelectedVehicleId(v?.id ?? null)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {/* Quick date strip — next 14 days */}
            <div className="rounded-2xl border border-border/70 bg-card p-3">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                  Tanggal
                </div>
                {selectedDate && (
                  <span className="text-[11px] font-medium text-primary">
                    {format(selectedDate, "dd MMM yyyy")}
                  </span>
                )}
              </div>
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
            </div>

            {/* Time slots — always visible once date selected */}
            {selectedDate && (
              <div className="rounded-2xl border border-border/70 bg-card p-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                    Jam
                  </div>
                  {isSameLocalDay(selectedDate, currentTime) && (
                    <span className="text-[10px] text-primary">+1 jam dari sekarang</span>
                  )}
                </div>
                {availableTimeSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    Slot habis untuk hari ini. Pilih tanggal lain.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {availableTimeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "h-10 rounded-xl border text-[11px] font-semibold transition-all",
                          selectedTime === time
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.5)]"
                            : "bg-card border-border/60 active:scale-95"
                        )}
                      >
                        {time.replace(" AM", "").replace(" PM", "")}
                        <span className="block text-[8px] opacity-70 leading-none mt-0.5">
                          {time.includes("PM") ? "PM" : "AM"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            {/* Hero service card */}
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_3px_10px_-3px_hsl(var(--primary)/0.6)]">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-primary font-semibold leading-none mb-1">
                    Layanan Dipilih ({selectedServicesData.length})
                  </p>
                  <h3 className="font-bold text-[15px] leading-tight line-clamp-2">
                    {summaryServiceName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Total {totalDuration} menit
                  </p>
                </div>
              </div>
              {selectedServicesData.length > 0 && (
                <ul className="space-y-1.5 pt-3 border-t border-primary/20">
                  {selectedServicesData.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="truncate font-medium">{s.name}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0">{formatIDR(s.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Grouped detail list — Apple iOS settings style */}
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
              <DetailRow icon={CalendarDays} label="Tanggal" value={selectedDate ? format(selectedDate, "EEE, dd MMM yyyy") : "-"} />
              <DetailRow icon={Clock} label="Jam" value={selectedTime || "-"} />
              <DetailRow icon={MapPin} label="Cabang" value={branch || "-"} />
              <DetailRow icon={Car} label="Kendaraan" value={`${carType} • ${carPlateNumber}`} last />
            </div>

            {/* Redemption */}
            {selectedServicesData.length > 0 && (
              <RedemptionCodeInput
                userId={user?.id}
                onRedemptionApplied={setAppliedRedemption}
                appliedRedemption={appliedRedemption}
              />
            )}

            {/* Price summary */}
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
                  <p className="text-[10px] text-muted-foreground mt-1">Belum termasuk part tambahan</p>
                </div>
                <span className="text-2xl font-bold text-primary leading-none">{formatIDR(priceInfo.final)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
        {step < 4 ? (
          <div className="px-3 py-3">
            <Button
              onClick={goNext}
              disabled={!canNext}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            >
              Lanjut <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="px-3 py-3 grid grid-cols-2 gap-2">
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

      {showPayment && lastBookingId && (
        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          bookingId={lastBookingId}
          amount={lastBookingAmount}
          serviceName={lastBookingService}
        />
      )}

      {/* Service info popup — Apple sheet style */}
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
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                  Durasi
                </p>
                <p className="text-sm font-bold mt-1.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {infoService?.duration} mnt
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <p className="text-[10px] uppercase tracking-wide text-primary/80 leading-none">
                  Harga
                </p>
                <p className="text-sm font-bold text-primary mt-1.5">
                  {infoService ? formatIDR(infoService.price) : "-"}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Teknisi profesional, garansi pengerjaan, dan harga transparan.
              </p>
            </div>
          </div>
          <DialogFooter className="px-5 pb-5 pt-1 flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setInfoService(null)}
              className="flex-1 rounded-xl"
            >
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
    </div>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  last?: boolean;
}) => (
  <div
    className={cn(
      "flex items-center gap-3 px-4 py-3",
      !last && "border-b border-border/50",
    )}
  >
    <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</p>
      <p className="text-[13px] font-semibold mt-1 truncate">{value}</p>
    </div>
  </div>
);

export default MobileBookingWizard;