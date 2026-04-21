import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Clock, Wrench, Loader2, Percent, DollarSign, ShieldAlert, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserVerification } from "@/hooks/useUserVerification";
import VehicleSelector from "@/components/booking/VehicleSelector";
import RedemptionCodeInput from "@/components/booking/RedemptionCodeInput";
import PaymentDialog from "@/components/PaymentDialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileBookingWizard from "@/components/booking/MobileBookingWizard";

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
  duration: number; // minutes
}

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

const timeSlots = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

const Booking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isVerified, isLoading: verificationLoading } = useUserVerification();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get pre-selected service from URL query params (for rescheduling)
  const preSelectedService = searchParams.get("service");

  const [selectedService, setSelectedService] = useState<string | null>(preSelectedService);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [carType, setCarType] = useState("");
  const [carPlateNumber, setCarPlateNumber] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [branch, setBranch] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appliedRedemption, setAppliedRedemption] = useState<RedemptionData | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [lastBookingAmount, setLastBookingAmount] = useState(0);
  const [lastBookingService, setLastBookingService] = useState("");

  // Fetch active services from DB (managed in marketing/admin panel)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,description,category,price,duration")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      if (error) {
        console.error("Failed to load services:", error);
        toast.error("Gagal memuat daftar layanan");
      } else {
        setServices(data || []);
      }
      setServicesLoading(false);
    })();
    return () => {
      mounted = false;
    };
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

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  // Buffer: minimal +1 jam dari sekarang untuk booking hari ini
  const BOOKING_BUFFER_MINUTES = 60;

  // Clear selected time if it's no longer available (with buffer) when date/time changes
  useEffect(() => {
    if (!selectedTime || !selectedDate) return;
    const isToday =
      selectedDate.getFullYear() === currentTime.getFullYear() &&
      selectedDate.getMonth() === currentTime.getMonth() &&
      selectedDate.getDate() === currentTime.getDate();
    if (!isToday) return;

    const [time, period] = selectedTime.split(" ");
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const slotMinutes = h * 60 + m;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + BOOKING_BUFFER_MINUTES;
    if (slotMinutes <= nowMinutes) setSelectedTime(null);
  }, [selectedDate, currentTime, selectedTime]);

  const handleBooking = () => {
    if (isVerified === false) {
      toast.error("Akun Anda sedang menunggu verifikasi. Anda belum dapat melakukan booking.");
      return;
    }
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error(t.booking.completeAllDetails);
      return;
    }
    // Re-validate slot is still in the future + buffer (in case user lingered)
    if (!availableTimeSlots.includes(selectedTime)) {
      toast.error("Slot waktu tidak valid. Pilih jam lain.");
      setSelectedTime(null);
      return;
    }
    if (!carType.trim() || !carPlateNumber.trim()) {
      toast.error(t.booking.enterVehicleInfo);
      return;
    }
    if (!branch) {
      toast.error(t.booking.selectBranchLocation);
      return;
    }
    setShowConfirmation(true);
  };

  const submitBooking = async (payLater: boolean) => {
    if (!selectedService || !selectedDate || !selectedTime || !user) {
      toast.error(t.booking.missingInfo);
      return;
    }

    setIsSubmitting(true);

    const service = services.find((s) => s.id === selectedService);
    if (!service) {
      toast.error(t.booking.invalidService);
      setIsSubmitting(false);
      return;
    }

    const durationMinutes = service.duration || 60;
    const originalPrice = service.price;
    let finalPrice = originalPrice;

    if (appliedRedemption) {
      if (appliedRedemption.discount_type === "percentage") {
        finalPrice = originalPrice * (1 - appliedRedemption.discount_value / 100);
      } else {
        finalPrice = Math.max(0, originalPrice - appliedRedemption.discount_value);
      }
    }

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
      service_name: service.name,
      service_price: finalPrice,
      service_duration: durationMinutes,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      booking_time: selectedTime,
      status: payLater ? 'waiting_confirmation' : 'pending',
      payment_status: payLater ? 'pay_later' : 'unpaid',
      car_type: carType.trim(),
      car_plate_number: carPlateNumber.trim(),
      branch: branch,
    }).select("id").single();

    if (error) {
      console.error('Booking error:', error);
      toast.error(t.booking.failedToBook, { description: error.message });
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
    setShowConfirmation(false);

    if (payLater && bookingData) {
      toast.success("Booking dibuat — bayar di tempat saat datang", {
        description: "Anda dapat membatalkan booking dengan persetujuan staff.",
      });
      navigate(`/my-booking/${bookingData.id}`);
      return;
    }

    toast.success(t.booking.bookedSuccess, {
      description: "Mengarahkan ke halaman status booking...",
    });

    if (bookingData) {
      // Langsung pindah ke halaman status booking; user bisa bayar dari sana
      navigate(`/my-booking/${bookingData.id}?pay=1`, { replace: true });
    } else {
      setTimeout(() => navigate("/"), 1500);
    }
  };

  const confirmBooking = () => submitBooking(false);
  const confirmBookingPayLater = () => submitBooking(true);

  // selectedServiceData computed above via useMemo

  // Calculate discounted price
  const calculateFinalPrice = () => {
    if (!selectedServiceData) return { original: 0, final: 0, discount: 0 };
    const originalPrice = selectedServiceData.price;
    
    if (!appliedRedemption) {
      return { original: originalPrice, final: originalPrice, discount: 0 };
    }

    let discount = 0;
    if (appliedRedemption.discount_type === "percentage") {
      discount = originalPrice * (appliedRedemption.discount_value / 100);
    } else {
      discount = Math.min(appliedRedemption.discount_value, originalPrice);
    }

    return {
      original: originalPrice,
      final: Math.max(0, originalPrice - discount),
      discount: discount,
    };
  };

  const priceInfo = calculateFinalPrice();

  // Convert "09:00 AM" / "01:00 PM" → minutes since midnight
  const slotToMinutes = (slot: string) => {
    const [time, period] = slot.split(" ");
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  // Compare two Date objects by local Y/M/D (timezone-safe)
  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Filter out past time slots if booking for today (with +1h buffer)
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return timeSlots;
    if (!isSameLocalDay(selectedDate, currentTime)) return timeSlots;

    const minMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + BOOKING_BUFFER_MINUTES;
    return timeSlots.filter((slot) => slotToMinutes(slot) >= minMinutes);
  };

  const availableTimeSlots = getAvailableTimeSlots();
  const isBookingToday = selectedDate ? isSameLocalDay(selectedDate, currentTime) : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.booking.backToDashboard}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-12">
        {isVerified === false && (
          <Alert className="mb-4 md:mb-6 border-destructive/40 bg-destructive/10">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive text-sm">
              Akun Anda sedang menunggu verifikasi. Anda belum dapat melakukan booking sampai akun diverifikasi oleh admin.
            </AlertDescription>
          </Alert>
        )}
        <div className="mb-5 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">{t.booking.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t.booking.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Service Selection */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        1
                      </div>
                      {t.booking.selectService}
                    </CardTitle>
                    <CardDescription>{t.booking.chooseService}</CardDescription>
                  </div>
                  {selectedService && (
                    <Badge variant="default" className="bg-accent">
                      <Check className="h-3 w-3 mr-1" />
                      {t.common.selected}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Search & Category filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari layanan..."
                      className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                          selectedCategory === cat
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                            : "bg-card border-border text-muted-foreground hover:border-primary/40"
                        }`}
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
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Tidak ada layanan ditemukan.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredServices.map((service) => {
                      const isSelected = selectedService === service.id;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setSelectedService(service.id)}
                          className={`text-left rounded-xl p-4 border bg-card transition-all duration-200 hover:scale-[1.02] ${
                            isSelected
                              ? "border-primary border-2 shadow-[0_0_12px_hsl(var(--primary)/0.4)] bg-primary/5"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm leading-snug">{service.name}</h3>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border/60">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{service.duration} min</span>
                            </div>
                            <span className="font-bold text-primary text-sm">
                              {formatIDR(service.price)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Date Selection */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        2
                      </div>
                      {t.booking.chooseDate}
                    </CardTitle>
                    <CardDescription>{t.booking.selectPreferredDate}</CardDescription>
                  </div>
                  {selectedDate && (
                    <Badge variant="default" className="bg-accent">
                      <Check className="h-3 w-3 mr-1" />
                      {format(selectedDate, "dd MMM yyyy")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date.getDay() === 0;
                  }}
                  className="rounded-md border pointer-events-auto"
                />
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Time Selection */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      3
                    </div>
                    {t.booking.pickTime}
                  </CardTitle>
                  <CardDescription className="flex items-center justify-between">
                    <span>{t.booking.chooseTimeSlot}</span>
                    <Badge variant="outline" className="ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      {t.booking.now}: {format(currentTime, "h:mm a")}
                    </Badge>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        className={`w-full justify-start ${
                          selectedTime === time ? "bg-primary" : ""
                        }`}
                        onClick={() => setSelectedTime(time)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {time}
                      </Button>
                    ))
                  ) : (
                    <div className="text-center py-6 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {isBookingToday
                          ? "Tidak ada jadwal tersedia hari ini"
                          : "Jam booking sudah penuh"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Silakan pilih tanggal lain (booking minimal 1 jam dari sekarang).
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 4: Vehicle Information */}
          <div className="lg:col-span-3">
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

          {/* Step 5: Redemption Code */}
          <div className="lg:col-span-3">
            <RedemptionCodeInput
              userId={user?.id}
              onRedemptionApplied={setAppliedRedemption}
              appliedRedemption={appliedRedemption}
            />
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle>{t.booking.bookingSummary}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.booking.service}</p>
                    <p className="font-semibold">
                      {selectedServiceData?.name || t.common.notSelected}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.booking.branch}</p>
                    <p className="font-semibold capitalize">
                      {branch || t.common.notSelected}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.booking.date}</p>
                    <p className="font-semibold">
                      {selectedDate ? format(selectedDate, "dd MMM yyyy") : t.common.notSelected}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.booking.time}</p>
                    <p className="font-semibold">{selectedTime || t.common.notSelected}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.booking.price}</p>
                    {appliedRedemption && priceInfo.discount > 0 ? (
                      <div>
                        <p className="text-sm line-through text-muted-foreground">
                          {formatIDR(priceInfo.original)}
                        </p>
                        <p className="font-semibold text-accent">
                          {formatIDR(priceInfo.final)}
                        </p>
                      </div>
                    ) : (
                      <p className="font-semibold text-primary">
                        {selectedServiceData ? formatIDR(selectedServiceData.price) : "--"}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.booking.carType}</p>
                    <p className="font-semibold">
                      {carType || t.common.notEntered}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.booking.plateNumber}</p>
                    <p className="font-semibold uppercase">
                      {carPlateNumber || t.common.notEntered}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full mt-6 h-12 text-base font-semibold"
                  onClick={handleBooking}
                  disabled={isVerified === false || !selectedService || !selectedDate || !selectedTime || !availableTimeSlots.includes(selectedTime || "") || !carType.trim() || !carPlateNumber.trim() || !branch}
                >
                  {t.booking.confirmBooking}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.booking.confirmAppointment}</DialogTitle>
            <DialogDescription>
              {t.booking.reviewBooking}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              {selectedServiceData && (
                <>
                  <div className="p-2 rounded-full bg-primary/10">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{selectedServiceData.name}</p>
                    {selectedServiceData.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedServiceData.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        {t.booking.duration}: {selectedServiceData.duration} min
                      </span>
                        {appliedRedemption && priceInfo.discount > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="line-through text-muted-foreground">
                            {formatIDR(priceInfo.original)}
                          </span>
                          <span className="font-semibold text-accent">
                            {formatIDR(priceInfo.final)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-primary">
                          {formatIDR(selectedServiceData?.price || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 border rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t.booking.branch}</p>
                <p className="font-semibold capitalize text-sm sm:text-base">{branch}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t.booking.date}</p>
                <p className="font-semibold text-sm sm:text-base">
                  {selectedDate ? format(selectedDate, "EEEE, dd MMM yyyy") : ""}
                </p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t.booking.time}</p>
                <p className="font-semibold text-sm sm:text-base">{selectedTime}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 border rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t.booking.carType}</p>
                <p className="font-semibold text-sm sm:text-base">{carType}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t.booking.plateNumber}</p>
                <p className="font-semibold uppercase text-sm sm:text-base">{carPlateNumber}</p>
              </div>
            </div>
            {appliedRedemption && (
              <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2">
                  {appliedRedemption.discount_type === "percentage" ? (
                    <Percent className="h-4 w-4 text-accent" />
                  ) : (
                    <DollarSign className="h-4 w-4 text-accent" />
                  )}
                  <p className="text-sm font-semibold text-accent">
                    {t.booking.discountApplied}: {appliedRedemption.reward_name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.booking.youSave} {formatIDR(priceInfo.discount)} {t.booking.withCode} {appliedRedemption.redemption_code}
                </p>
              </div>
            )}
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm font-semibold text-accent mb-1">
                {t.booking.loyaltyPointsEarn}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.booking.earnPointsDesc}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isSubmitting} className="w-full sm:w-auto">
              {t.booking.goBack}
            </Button>
            <Button
              variant="secondary"
              onClick={confirmBookingPayLater}
              disabled={isSubmitting}
              className="w-full sm:w-auto gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Bayar Nanti di Tempat
            </Button>
            <Button onClick={confirmBooking} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.booking.booking}
                </>
              ) : (
                <>Bayar Sekarang</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      {lastBookingId && (
        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          bookingId={lastBookingId}
          amount={lastBookingAmount}
          serviceName={lastBookingService}
          onPaymentComplete={() => {
            setTimeout(() => navigate("/"), 1500);
          }}
        />
      )}
    </div>
  );
};

export default Booking;
