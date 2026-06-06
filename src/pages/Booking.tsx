import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowRight, Check, Clock, Loader2, Search, ShieldAlert,
  Wrench, Car, CalendarDays, Tag, Sparkles, Plus, Info, MapPin,
  ChevronDown, HelpCircle, Receipt, StickyNote,
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import RedemptionCodeInput from "@/components/booking/RedemptionCodeInput";
import CashbackUsageInput from "@/components/booking/CashbackUsageInput";
import PickupLocationSection, { buildInitialPickupValue, type PickupValue } from "@/components/booking/PickupLocationSection";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserVerification } from "@/hooks/useUserVerification";
import { filterFutureSlots, isSameLocalDay, TIME_TICK_MS } from "@/lib/timeSlots";
import { cn } from "@/lib/utils";
import { fetchBranchesWithGeo, type BranchGeo } from "@/lib/geoUtils";
import { useSlotAvailability } from "@/hooks/useSlotAvailability";
import { useBookingServices, type BookingService } from "@/hooks/useBookingServices";
import { useCart } from "@/contexts/CartContext";

type ServiceItem = BookingService;
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
  source?: "reward" | "promo" | "referral";
  reward_mode?: "discount" | "cashback";
  cashback_max_amount?: number | null;
  cashback_validity_days?: number | null;
}

const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

const DEFAULT_BRANCH = "bandung";

const formatIDR = (n: number) => {
  if (!n || n <= 0) return "FREE";
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
};

const Booking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isVerified } = useUserVerification();
  const cart = useCart();

  // ───────── URL pre-selection (from /home hero form) ─────────
  const preService = searchParams.get("service");
  const preCarType = searchParams.get("carType");
  const fromCart = searchParams.get("cart") === "1";

  // Fallback to hero session prefs (set by MobileHero / HeroBookingForm) so
  // user's chosen Jadwal & Cabang stays in sync — even when navigating via
  // catalog/cart where URL params are absent.
  const heroPrefs = (() => {
    try {
      const raw = sessionStorage.getItem("hero-booking-prefs");
      return raw ? (JSON.parse(raw) as { branch?: string; date?: string; time?: string; vehicle?: string }) : {};
    } catch {
      return {};
    }
  })();
  const preDate = searchParams.get("date") ?? heroPrefs.date ?? null;
  const preTime = searchParams.get("time") ?? heroPrefs.time ?? null;
  const preBranch = searchParams.get("branch") ?? heroPrefs.branch ?? null;
  const preVehicle = searchParams.get("vehicle") ?? heroPrefs.vehicle ?? null;

  // ───────── Data ─────────
  const { services, loading: servicesLoading, promoLabel } = useBookingServices();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // ───────── Selections ─────────
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    preService
      ? [preService]
      : fromCart || cart.items.length > 0
        ? cart.items.map((i) => i.id)
        : []
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
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    (() => {
      if (!preBranch) return DEFAULT_BRANCH;
      const norm = preBranch.toLowerCase().trim();
      // Cocokkan ke slug (DB-aware) — diperbaiki lagi setelah branches dimuat.
      return norm || DEFAULT_BRANCH;
    })()
  );
  const [customerNotes, setCustomerNotes] = useState<string>("");
  const [pickup, setPickup] = useState<PickupValue>(buildInitialPickupValue());

  // Branches dari DB (sinkron dengan /dashboard/branches)
  const [branchList, setBranchList] = useState<BranchGeo[]>([]);
  useEffect(() => {
    fetchBranchesWithGeo().then((rows) => {
      setBranchList(rows);
      // Pastikan selectedBranchId valid; kalau tidak, fallback ke pertama.
      if (rows.length && !rows.some((b) => b.slug === selectedBranchId)) {
        setSelectedBranchId(rows[0].slug);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────── UI ─────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [now, setNow] = useState(new Date());
  const [appliedRedemption, setAppliedRedemption] = useState<RedemptionData | null>(null);
  const [cashbackToUse, setCashbackToUse] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const upsellShownRef = useRef(false);
  const [infoService, setInfoService] = useState<ServiceItem | null>(null);

  // ───────── Collapse state (auto-collapse when satisfied; user can re-open) ─────────
  // Services panel selalu terbuka (tidak bisa di-collapse) sesuai permintaan UX.
  const openServices = true;
  const [openVehicle, setOpenVehicle] = useState(true);
  const [openSchedule, setOpenSchedule] = useState(true);
  const [openBranch, setOpenBranch]     = useState(!preBranch);

  // ───────── Effects: live clock ─────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(t);
  }, []);

  // ───────── Validate & reveal pre-selected service ─────────
  // Saat services selesai dimuat, pastikan layanan yang dipre-select via
  // ?service=<id> benar-benar ada. Jika tidak, beri tahu user. Juga reset
  // filter kategori ke "all" supaya layanan tersebut pasti terlihat di list.
  useEffect(() => {
    if (servicesLoading || !preService) return;
    const found = services.find(
      (s) => s.id === preService || (s as any).booking_service_id === preService
    );
    if (!found) {
      toast.error("Layanan yang dipilih tidak tersedia. Silakan pilih ulang.");
      setSelectedServiceIds([]);
      return;
    }
    setSelectedCategory("all");
    // Pastikan ID benar-benar ada di state, dan buang ID URL yang mungkin
    // berbeda (mis. booking_service_id) agar tidak ada ID "hantu".
    setSelectedServiceIds((prev) => {
      const cleaned = prev.filter((id) => id !== preService && id !== found.id);
      return [found.id, ...cleaned];
    });
    // Scroll halus ke kartu layanan terpilih agar user lihat tanda checklist
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-service-id="${found.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [servicesLoading, services, preService]);

  // ───────── Sync booking selections ⇄ global cart ─────────
  // Whenever the user picks/unpicks services in the booking page, mirror that
  // into the cart so the floating "Pesanan" pill survives navigation away.
  useEffect(() => {
    if (servicesLoading) return;
    const items = selectedServiceIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is ServiceItem => !!s)
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        category: s.category,
      }));
    cart.setItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceIds, services, servicesLoading]);

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
    const list = services.filter((s) => {
      const okCat = selectedCategory === "all" || s.category === selectedCategory;
      const okQ = !q || s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q);
      return okCat && okQ;
    });
    // Tampilkan layanan yang sudah dipilih user di paling depan (paling kiri)
    if (selectedServiceIds.length === 0) return list;
    const selectedSet = new Set(selectedServiceIds);
    const selectedFirst = list.filter((s) => selectedSet.has(s.id));
    const rest = list.filter((s) => !selectedSet.has(s.id));
    return [...selectedFirst, ...rest];
  }, [services, searchQuery, selectedCategory, selectedServiceIds]);

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
    // Cashback-mode promo TIDAK mengurangi harga sekarang
    if (!appliedRedemption || appliedRedemption.reward_mode === "cashback") {
      return { original, final: original, discount: 0 };
    }
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

  // Capacity per branch+date (realtime)
  const { slots: slotInfo } = useSlotAvailability(
    selectedBranchId ?? null,
    selectedDate ?? null,
    TIME_SLOTS
  );

  // Drop selectedTime if it falls out of available list
  useEffect(() => {
    if (selectedTime && !availableSlots.includes(selectedTime)) setSelectedTime(null);
  }, [availableSlots, selectedTime]);

  // Drop selectedTime if it became full/closed
  useEffect(() => {
    if (!selectedTime) return;
    const info = slotInfo[selectedTime];
    if (info && info.status !== "available") {
      setSelectedTime(null);
      toast.error(`Slot ${selectedTime} sudah ${info.status === "full" ? "penuh" : "ditutup"}.`);
    }
  }, [slotInfo, selectedTime]);

  const hasService = selectedServices.length > 0;
  const hasVehicle = !!carType.trim() && !!carPlate.trim();
  const hasSchedule = !!selectedDate && !!selectedTime;
  const hasBranch = !!selectedBranchId;
  const hasPickupOK = pickup.serviceLocation === "workshop" || pickup.isValid;
  const isComplete = hasService && hasVehicle && hasSchedule && hasBranch && hasPickupOK;
  const pickupTotalFee = pickup.pickupFee + pickup.returnFee;

  const selectedBranch = useMemo(
    () =>
      branchList.find((b) => b.slug === selectedBranchId) ??
      branchList[0] ?? { id: "", slug: selectedBranchId, name: selectedBranchId, address: "", lat: 0, lng: 0 },
    [selectedBranchId, branchList],
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  // ───────── Auto-collapse when each section is satisfied ─────────
  // Catatan: services tidak ikut auto-collapse — selalu tampil.
  useEffect(() => { if (hasVehicle) setOpenVehicle(false); }, [hasVehicle]);
  useEffect(() => { if (hasSchedule) setOpenSchedule(false); }, [hasSchedule]);
  useEffect(() => { if (hasBranch && preBranch) setOpenBranch(false); }, [hasBranch, preBranch]);

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

  const submitBooking = async () => {
    if (!user) { toast.error("Silakan masuk dulu"); return; }
    if (isVerified === false) { toast.error("Akun belum diverifikasi"); return; }
    if (!isComplete) {
      toast.error(
        pickup.serviceLocation === "pickup" && !pickup.isValid
          ? "Lengkapi alamat & jarak pick-up (sesuai batas area)"
          : "Lengkapi semua data dulu"
      );
      return;
    }

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
        created_by: user.id,
        vehicle_id: selectedVehicleId,
        customer_name: profile?.full_name || user.email?.split("@")[0] || "Customer",
        customer_email: user.email || "",
        customer_phone: profile?.phone || "",
        service_type: combinedType,
        service_name: combinedName,
        service_price: priceInfo.final + pickupTotalFee,
        service_duration: totalDuration || 60,
        original_service_price: priceInfo.original + pickupTotalFee,
        discount_amount: priceInfo.discount,
        discount_code: appliedRedemption?.redemption_code ?? null,
        discount_label: appliedRedemption?.reward_name ?? null,
        discount_source: appliedRedemption?.source ?? null,
        booking_date: format(selectedDate!, "yyyy-MM-dd"),
        booking_time: selectedTime!,
        status: "waiting_confirmation",
        payment_status: "unpaid",
        payment_method: null,
        car_type: carType.trim(),
        car_plate_number: carPlate.trim(),
        branch: selectedBranchId,
        customer_notes: customerNotes.trim() || null,
        service_location: pickup.serviceLocation,
        pickup_address: pickup.serviceLocation === "pickup" ? pickup.address.trim() : null,
        pickup_distance_km: pickup.serviceLocation === "pickup" ? parseFloat(pickup.distanceKm) : null,
        pickup_fee: pickup.pickupFee,
        pickup_return: pickup.withReturn,
        pickup_return_fee: pickup.returnFee,
        pickup_lat: pickup.serviceLocation === "pickup" ? pickup.lat ?? null : null,
        pickup_lng: pickup.serviceLocation === "pickup" ? pickup.lng ?? null : null,
        pickup_accuracy_m: pickup.serviceLocation === "pickup" ? pickup.accuracyM ?? null : null,
        pickup_source: pickup.serviceLocation === "pickup" ? pickup.source ?? null : null,
        pickup_nearest_branch_id: pickup.serviceLocation === "pickup" ? pickup.nearestBranchId ?? null : null,
      })
      .select("id")
      .single();

    if (error || !booking) {
      setIsSubmitting(false);
      toast.error("Gagal membuat booking", { description: error?.message });
      return;
    }

    if (appliedRedemption) {
      try {
        if (appliedRedemption.source === "referral") {
          await supabase.rpc("redeem_referral_voucher", {
            _booking_id: booking.id,
            _code: appliedRedemption.redemption_code,
          });
        } else if (appliedRedemption.source === "promo") {
          await supabase
            .from("promo_claims")
            .update({ status: "used", used_at: new Date().toISOString() })
            .eq("id", appliedRedemption.id);
        } else {
          await supabase
            .from("reward_redemptions")
            .update({ status: "used", used_at: new Date().toISOString() })
            .eq("id", appliedRedemption.id);
        }
      } catch (e) {
        console.error("Voucher consume error:", e);
      }
    }

    setIsSubmitting(false);
    // Booking submitted — clear the floating cart so the pill goes away.
    cart.clear();
    toast.success("Pesanan terkirim — menunggu konfirmasi admin");
    navigate(`/my-booking/${booking.id}`);
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

      <main
        className={cn(
          "container mx-auto px-4 py-4 md:py-6 grid grid-cols-1 gap-2 transition-all",
          openServices ? "lg:grid-cols-3 lg:gap-6" : "lg:grid-cols-1 lg:max-w-2xl"
        )}
      >
        {/* ───────── Left: Services ───────── */}
        <section className={cn(openServices ? "space-y-3 lg:col-span-2" : "")}>
          {openServices && (
          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
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
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:snap-none md:mx-0 md:px-0">
                {filteredServices.map((s) => {
                  const isSel = selectedServiceIds.includes(s.id);
                  const idx = selectedServiceIds.indexOf(s.id);
                  return (
                    <div
                      key={s.id}
                      data-service-id={s.id}
                      className={cn(
                        "relative rounded-2xl border bg-card transition-all overflow-hidden shrink-0 w-[160px] snap-start md:w-auto",
                        isSel
                          ? "border-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.45)] bg-primary/5"
                          : "border-border/70"
                      )}
                    >
                      {/* Marketing badge "POPULER" only — custom badge text dihilangkan */}
                      {s.is_popular && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow-sm">
                            POPULER
                          </span>
                        </div>
                      )}
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
          )}
        </section>

        {/* ───────── Right: Vehicle + Schedule + Summary ───────── */}
        <aside
          className={cn(
            "space-y-2",
            (openVehicle || openSchedule) && "[&>div]:!mt-4"
          )}
        >
          {/* Vehicle */}
          {hasVehicle && selectedVehicle && (
            <CollapsedRow
              icon={Car}
              label="Kendaraan"
              summary={`${selectedVehicle.brand} ${selectedVehicle.model}`}
              detail={selectedVehicle.license_plate}
              isOpen={openVehicle}
              onToggle={() => setOpenVehicle((v) => !v)}
            />
          )}
          {openVehicle && (
          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {!hasVehicle && <SectionHeader icon={Car} title="Kendaraan" />}
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
          )}

          {/* Schedule */}
          {hasSchedule && selectedDate && selectedTime && (
            <CollapsedRow
              icon={CalendarDays}
              label="Jadwal"
              summary={`${format(selectedDate, "EEE, d MMM", { locale: idLocale })} • ${selectedTime}`}
              isOpen={openSchedule}
              onToggle={() => setOpenSchedule((v) => !v)}
            />
          )}
          {openSchedule && (
          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {!hasSchedule && <SectionHeader icon={CalendarDays} title="Jadwal" />}

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
                    {availableSlots.map((slot) => {
                      const info = slotInfo[slot];
                      const isFull = info?.status === "full";
                      const isClosed = info?.status === "closed";
                      const disabled = isFull || isClosed;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && setSelectedTime(slot)}
                          title={
                            isClosed ? "Slot ditutup"
                            : isFull ? "Slot penuh"
                            : info ? `${info.remaining}/${info.max} tersisa` : undefined
                          }
                          className={cn(
                            "h-12 rounded-xl border text-[12px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5",
                            disabled && "opacity-50 cursor-not-allowed line-through",
                            !disabled && selectedTime === slot
                              ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.5)]"
                              : !disabled && "bg-card border-border/60 active:scale-95"
                          )}
                        >
                          <span>{slot}</span>
                          {info && (
                            <span className={cn(
                              "text-[9px] font-normal",
                              isFull ? "text-destructive" : isClosed ? "text-muted-foreground" : "text-muted-foreground"
                            )}>
                              {isClosed ? "Tutup" : isFull ? "Penuh" : `${info.remaining}/${info.max}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Lokasi Servis + pemilihan cabang (terpadu, sinkron DB /dashboard/branches) */}
          <PickupLocationSection
            value={pickup}
            onChange={setPickup}
            selectedBranchSlug={selectedBranchId}
            onSelectBranchSlug={(slug) => {
              if (slug !== selectedBranchId) {
                setSelectedBranchId(slug);
                setOpenBranch(false);
              }
            }}
          />

          {/* Catatan / Keluhan */}
          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <SectionHeader icon={StickyNote} title="Catatan / Keluhan" />
            <p className="text-[11px] text-muted-foreground -mt-1">
              Sampaikan keluhan kendaraan atau permintaan khusus agar teknisi siap saat Anda tiba.
            </p>
            <Textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value.slice(0, 500))}
              placeholder="Contoh: AC kurang dingin, ada suara dari roda depan, mohon cek rem..."
              className="min-h-[84px] resize-none text-[13px] rounded-xl bg-muted/30 border-border/60"
            />
            <div className="flex justify-end">
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {customerNotes.length}/500
              </span>
            </div>
          </div>

          {/* Redemption + Summary */}
          {hasService && (
            <RedemptionCodeInput
              userId={user?.id}
              onRedemptionApplied={setAppliedRedemption}
              appliedRedemption={appliedRedemption}
              selectedServiceCategories={Array.from(new Set(selectedServices.map((s) => s.category)))}
              selectedServiceIds={selectedServices.map((s) => s.id)}
            />
          )}

          {hasService && (
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-primary" />
                Rincian Pembayaran
              </h3>

              {/* Per-service line items */}
              <ul className="space-y-2 mb-3">
                {selectedServices.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-3 text-[13px]"
                  >
                    <span className="text-muted-foreground line-clamp-1 flex-1">
                      {s.name}
                    </span>
                    <span className="text-foreground font-medium tabular-nums shrink-0">
                      {formatIDR(s.price)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border/50 my-2" />

              {/* Summary rows */}
              <div className="space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Subtotal Pesanan
                  </span>
                  <span className="text-foreground tabular-nums">
                    {formatIDR(priceInfo.original)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    Estimasi Durasi
                  </span>
                  <span className="text-foreground tabular-nums">
                    {totalDuration} mnt
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    Biaya Layanan
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="Info biaya layanan"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="text-xs w-60"
                      >
                        Biaya layanan untuk pemesanan dan dukungan pelanggan
                        Sahabat Stroban. Saat ini gratis.
                      </PopoverContent>
                    </Popover>
                  </span>
                  <span className="text-emerald-600 font-medium">GRATIS</span>
                </div>

                {priceInfo.discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Voucher Diskon
                      {appliedRedemption?.reward_name && (
                        <span className="text-[10px] text-muted-foreground/80">
                          ({appliedRedemption.reward_name})
                        </span>
                      )}
                    </span>
                    <span className="text-primary font-medium tabular-nums">
                      −{formatIDR(priceInfo.discount)}
                    </span>
                  </div>
                )}

                {pickup.serviceLocation === "pickup" && pickup.pickupFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Biaya Pick-up</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {formatIDR(pickup.pickupFee)}
                    </span>
                  </div>
                )}
                {pickup.serviceLocation === "pickup" && pickup.withReturn && pickup.returnFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Biaya Antar Pulang</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {formatIDR(pickup.returnFee)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 my-3" />

              {/* Grand total */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground leading-none">
                    Total Pembayaran
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {selectedServices.length} layanan
                  </p>
                </div>
                <span className="text-2xl font-bold text-primary leading-none tabular-nums">
                  {formatIDR(priceInfo.final + pickupTotalFee)}
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
                {hasService && hasVehicle && hasSchedule && !hasBranch && "Pilih cabang."}
              </div>
              <Button disabled className="h-11 rounded-xl px-6">
                Lanjut <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => submitBooking()}
              disabled={isSubmitting || isVerified === false}
              className="w-full h-12 rounded-xl text-sm font-semibold gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Check className="h-4 w-4" /> Konfirmasi Pesanan Booking</>
              )}
            </Button>
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

const CollapsedRow = ({
  icon: Icon, label, summary, detail, isOpen, onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  summary: string;
  detail?: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={isOpen}
    className="w-full rounded-2xl border border-border/70 bg-card p-3 flex items-center gap-3 text-left active:scale-[0.99] transition hover:border-primary/40"
  >
    <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </span>
      <span className="block text-[13px] font-semibold leading-tight mt-1 truncate">
        {summary}
      </span>
      {detail && (
        <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
          {detail}
        </span>
      )}
    </span>
    <ChevronDown
      className={cn(
        "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300",
        isOpen && "rotate-180 text-primary"
      )}
    />
  </button>
);

export default Booking;