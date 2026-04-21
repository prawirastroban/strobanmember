import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, Search, ShieldAlert, Wrench, Car, CalendarDays, FileCheck2 } from "lucide-react";
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
  const [selectedService, setSelectedService] = useState<string | null>(preSelectedService);

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

  const selectedServiceData = useMemo(
    () => services.find((s) => s.id === selectedService) || null,
    [services, selectedService],
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
    if (!selectedServiceData) return { original: 0, final: 0, discount: 0 };
    const original = selectedServiceData.price;
    if (!appliedRedemption) return { original, final: original, discount: 0 };
    let discount = 0;
    if (appliedRedemption.discount_type === "percentage") {
      discount = original * (appliedRedemption.discount_value / 100);
    } else {
      discount = Math.min(appliedRedemption.discount_value, original);
    }
    return { original, final: Math.max(0, original - discount), discount };
  }, [selectedServiceData, appliedRedemption]);

  // Step validation
  const canNext = useMemo(() => {
    if (step === 1) return !!selectedService;
    if (step === 2) return !!carType.trim() && !!carPlateNumber.trim() && !!branch;
    if (step === 3) return !!selectedDate && !!selectedTime;
    return true;
  }, [step, selectedService, carType, carPlateNumber, branch, selectedDate, selectedTime]);

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
    if (!selectedService || !selectedDate || !selectedTime || !user || !selectedServiceData) {
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

    const { data: bookingData, error } = await supabase.from('bookings').insert({
      user_id: user.id,
      vehicle_id: selectedVehicleId,
      customer_name: profile?.full_name || user.email?.split('@')[0] || 'Customer',
      customer_email: user.email || '',
      customer_phone: profile?.phone || '',
      service_type: selectedService,
      service_name: selectedServiceData.name,
      service_price: finalPrice,
      service_duration: selectedServiceData.duration || 60,
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
      {/* Sticky header with progress */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2 px-3 h-12">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground leading-none">Langkah {step} dari {STEPS.length}</div>
            <div className="text-sm font-semibold leading-tight mt-0.5">{STEPS[step - 1].label}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-300"
            style={{ width: `${stepProgress}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex items-center justify-between px-4 py-2.5">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      isActive && "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)] scale-110",
                      isDone && "bg-primary/80 text-primary-foreground",
                      !isActive && !isDone && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-1 -mt-4 transition-colors",
                    isDone ? "bg-primary/70" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
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
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari layanan..."
                  className="pl-9 h-11"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap capitalize transition-all flex-shrink-0",
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                        : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    {cat === "all" ? "Semua" : cat}
                  </button>
                ))}
              </div>
            </div>

            {servicesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada layanan.</p>
            ) : (
              <div className="space-y-2">
                {filteredServices.map((s) => {
                  const isSel = selectedService === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedService(s.id)}
                      className={cn(
                        "w-full text-left rounded-xl p-3.5 border bg-card transition-all",
                        isSel
                          ? "border-primary border-2 shadow-[0_0_14px_hsl(var(--primary)/0.35)] bg-primary/5"
                          : "border-border active:scale-[0.98]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm leading-snug flex-1">{s.name}</h3>
                        {isSel && <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
                      </div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{s.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {s.duration} mnt
                        </span>
                        <span className="text-sm font-bold text-primary">{formatIDR(s.price)}</span>
                      </div>
                    </button>
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
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">Pilih Tanggal</div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                className="w-full"
              />
            </div>
            {selectedDate && (
              <div className="rounded-xl border bg-card p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                  Pilih Jam {selectedDate && isSameLocalDay(selectedDate, currentTime) && (
                    <span className="text-[10px] text-primary ml-1">(buffer 1 jam dari sekarang)</span>
                  )}
                </div>
                {availableTimeSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Tidak ada slot tersedia hari ini, pilih tanggal lain.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "h-11 rounded-lg border text-xs font-medium transition-all",
                          selectedTime === time
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                            : "bg-card border-border active:scale-95"
                        )}
                      >
                        {time}
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
            {/* Summary card */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Ringkasan Booking</h3>
              </div>
              <Row label="Layanan" value={selectedServiceData?.name || "-"} />
              <Row label="Durasi" value={`${selectedServiceData?.duration || 0} menit`} />
              <Row label="Tanggal" value={selectedDate ? format(selectedDate, "dd MMM yyyy") : "-"} />
              <Row label="Jam" value={selectedTime || "-"} />
              <Row label="Cabang" value={branch || "-"} />
              <Row label="Kendaraan" value={`${carType} • ${carPlateNumber}`} />
            </div>

            {/* Redemption code */}
            {selectedServiceData && (
              <RedemptionCodeInput
                userId={user?.id}
                onRedemptionApplied={setAppliedRedemption}
                appliedRedemption={appliedRedemption}
              />
            )}

            {/* Price */}
            <div className="rounded-xl border bg-card p-4">
              {priceInfo.discount > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Harga normal</span>
                    <span className="line-through">{formatIDR(priceInfo.original)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-primary mt-1">
                    <span>Diskon</span>
                    <span>− {formatIDR(priceInfo.discount)}</span>
                  </div>
                  <div className="border-t border-border/60 my-2" />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">{formatIDR(priceInfo.final)}</span>
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
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-muted-foreground flex-shrink-0">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default MobileBookingWizard;