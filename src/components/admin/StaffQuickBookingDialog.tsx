import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Car, Plus, CalendarCheck, ChevronRight, Search, UserPlus, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { filterFutureSlots, isSameLocalDay, slotToMinutes, TIME_TICK_MS } from "@/lib/timeSlots";
import { useScopedBranches } from "@/hooks/useBranches";
import { useBookingServices } from "@/hooks/useBookingServices";
import { useSlotAvailability } from "@/hooks/useSlotAvailability";
import { useActivePromos, type ActivePromo } from "@/hooks/useActivePromos";
import { computeDiscount, formatRp } from "@/lib/promoDiscount";
import { Tag, CheckCircle2 } from "lucide-react";
import { BookingShareCard } from "@/components/admin/BookingShareCard";
import { normalizePhoneDigits } from "@/lib/phoneEmail";

// ── Types ──────────────────────────────────────────────────────────────────
interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  is_new?: boolean;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string;
  tire_size: string | null;
}

interface StaffQuickBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
];

const STEP_LABELS = ["Customer", "Vehicle", "Service & Schedule", "Promo", "Confirm"];

// ── Sub-components ─────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
            step >= i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {i + 1}
          </div>
          {i < STEP_LABELS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      ))}
      <span className="text-xs text-muted-foreground ml-2">{STEP_LABELS[step - 1]}</span>
    </div>
  );
}

// ── Inline Add Customer ────────────────────────────────────────────────────
function InlineAddCustomer({ onCreated, onCancel }: { onCreated: (c: Customer) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    const waDigits = normalizePhoneDigits(phone);
    if (!name.trim() || !waDigits || waDigits.length < 10) {
      toast({ variant: "destructive", title: "Nama dan nomor WhatsApp wajib diisi" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-user-ops", {
      body: {
        action: "create_customer",
        fullName: name.trim(),
        email: email.trim() || null,
        phone: waDigits,
      },
    });
    if (error || !data?.success) {
      toast({ variant: "destructive", title: "Error", description: error?.message || data?.error || "Gagal membuat customer" });
      setSaving(false);
      return;
    }
    const c = data.customer;
    onCreated({ id: c.id, full_name: c.full_name, phone: c.phone, email: c.email, is_new: Boolean(data.is_new) });
    setSaving(false);
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <p className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> New Customer</p>
      <div className="grid gap-2">
        <Label>Nama <span className="text-destructive">*</span></Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" />
      </div>
      <div className="grid gap-2">
        <Label>WhatsApp <span className="text-destructive">*</span></Label>
        <Input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="0812xxxx atau +6281xxxx"
        />
        <p className="text-[11px] text-muted-foreground">Dipakai untuk kirim link aktivasi & tracking via WhatsApp.</p>
      </div>
      <div className="grid gap-2">
        <Label>Email <span className="text-muted-foreground text-xs">(opsional)</span></Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Otomatis dibuat dari nomor HP bila kosong" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
        </Button>
      </div>
    </div>
  );
}

// ── Inline Add Vehicle ─────────────────────────────────────────────────────
function InlineAddVehicle({ customerId, onCreated, onCancel }: { customerId: string; onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ brand: "", model: "", year: "", license_plate: "", tire_size: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!form.brand || !form.model || !form.license_plate) {
      toast({ variant: "destructive", title: "Brand, Model, and Plate are required" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicles").insert({
      brand: form.brand, model: form.model,
      year: form.year ? parseInt(form.year) : null,
      license_plate: form.license_plate.toUpperCase(),
      tire_size: form.tire_size || null,
      user_id: customerId,
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Vehicle added" });
      onCreated();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <p className="text-sm font-semibold flex items-center gap-2"><Car className="h-4 w-4" /> New Vehicle</p>
      {[
        { key: "brand", label: "Brand", req: true },
        { key: "model", label: "Model", req: true },
        { key: "year", label: "Year", req: false },
        { key: "license_plate", label: "License Plate", req: true },
        { key: "tire_size", label: "Tire Size", req: false },
      ].map(f => (
        <div key={f.key} className="grid gap-1">
          <Label className="text-xs">{f.label} {f.req && <span className="text-destructive">*</span>}</Label>
          <Input
            value={form[f.key as keyof typeof form]}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.label}
            className="h-8 text-sm"
          />
        </div>
      ))}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
        </Button>
      </div>
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────────────────────
const StaffQuickBookingDialog = ({ open, onOpenChange }: StaffQuickBookingDialogProps) => {
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  const { services: catalogServices, loading: servicesLoading } = useBookingServices();
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  // Step 1 – Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Step 2 – Vehicle
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // Step 3 – Service & Schedule
  const [selectedService, setSelectedService] = useState("");
  const [branch, setBranch] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    if (isLocked && lockedBranch && branch !== lockedBranch) setBranch(lockedBranch);
  }, [isLocked, lockedBranch]);
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);
  const availableSlots = useMemo(
    () => filterFutureSlots(TIME_SLOTS, date || null, now),
    [date, now],
  );
  const dateObj = useMemo(() => (date ? new Date(`${date}T00:00:00`) : null), [date]);
  const { slots: slotInfo, loading: slotsLoading } = useSlotAvailability(
    branch || null,
    dateObj,
    availableSlots,
  );
  // If selected time becomes unavailable (full/closed), clear it.
  useEffect(() => {
    if (!time) return;
    const info = slotInfo[time];
    if (info && info.status !== "available") setTime("");
  }, [slotInfo, time]);
  useEffect(() => {
    if (!time || !date) return;
    if (!isSameLocalDay(date, now)) return;
    const cutoff = now.getHours() * 60 + now.getMinutes() + 30;
    if (slotToMinutes(time) < cutoff) setTime("");
  }, [date, time, now]);

  // Step 4 – Submit
  const [submitting, setSubmitting] = useState(false);

  // Created booking (for share confirmation step)
  const [createdBooking, setCreatedBooking] = useState<{
    id: string;
    token: string | null;
    claimUrl: string | null;
    isNewUser: boolean;
    snapshot: {
      customerName: string;
      customerPhone: string | null;
      serviceName: string;
      date: string;
      time: string;
      branch: string;
      vehicleLabel: string;
    };
  } | null>(null);

  // Promo (new step between Service & Schedule and Confirm)
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setCustomerSearch("");
      setCustomers([]);
      setSelectedCustomer(null);
      setShowAddCustomer(false);
      setVehicles([]);
      setSelectedVehicle(null);
      setShowAddVehicle(false);
      setSelectedService("");
      setBranch("");
      setDate("");
      setTime("");
      setSelectedPromoId(null);
      setCreatedBooking(null);
    }
  }, [open]);

  // Search customers
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const q = `%${customerSearch}%`;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .or(`full_name.ilike.${q},phone.ilike.${q}`)
        .limit(10);

      // Get emails from bookings for these profiles
      const ids = (profiles || []).map(p => p.id);
      let emailMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("user_id, customer_email")
          .in("user_id", ids);
        (bookings || []).forEach(b => { if (!emailMap[b.user_id]) emailMap[b.user_id] = b.customer_email; });
      }

      setCustomers((profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        email: emailMap[p.id] || "",
      })));
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Fetch vehicles when customer selected
  const fetchVehicles = async (userId: string) => {
    setVehiclesLoading(true);
    const { data } = await supabase
      .from("vehicles")
      .select("id, brand, model, year, license_plate, tire_size")
      .eq("user_id", userId);
    setVehicles(data || []);
    setVehiclesLoading(false);
  };

  useEffect(() => {
    if (selectedCustomer) {
      fetchVehicles(selectedCustomer.id);
      setSelectedVehicle(null);
      setShowAddVehicle(false);
    }
  }, [selectedCustomer]);

  const service = catalogServices.find(s => s.id === selectedService);

  // Fetch promos eligible for the currently selected service
  const { promos: activePromos, loading: promosLoading } = useActivePromos({
    serviceId: service?.id || null,
    category: service?.category || null,
    price: service?.price || null,
    enabled: !!service && step >= 4,
  });
  // Clear selected promo if it becomes ineligible (e.g. service changed)
  useEffect(() => {
    if (selectedPromoId && !activePromos.find(p => p.id === selectedPromoId)) {
      setSelectedPromoId(null);
    }
  }, [activePromos, selectedPromoId]);
  const selectedPromo: ActivePromo | null =
    activePromos.find(p => p.id === selectedPromoId) || null;
  const pricing = computeDiscount(selectedPromo, service?.price || 0);

  const handleConfirm = async () => {
    if (!selectedCustomer || !selectedVehicle || !service || !branch || !date || !time) return;
    setSubmitting(true);

    const { data: authData } = await supabase.auth.getUser();
    const actorId = authData?.user?.id ?? null;

    const promoNote = selectedPromo
      ? `[Promo: ${selectedPromo.title} (-${formatRp(pricing.discount)})]`
      : null;

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: selectedCustomer.id,
        created_by: actorId,
        vehicle_id: selectedVehicle.id,
        customer_name: selectedCustomer.full_name || "Walk-in",
        customer_email: selectedCustomer.email || "noemail@placeholder.com",
        customer_phone: selectedCustomer.phone || "",
        service_type: service.category || "service",
        service_name: service.name,
        service_price: pricing.finalPrice,
        service_duration: service.duration,
        booking_date: date,
        booking_time: time,
        branch,
        car_type: `${selectedVehicle.brand} ${selectedVehicle.model}`,
        car_plate_number: selectedVehicle.license_plate,
        status: "pending",
        customer_notes: promoNote,
      })
      .select("id, public_track_token")
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setSubmitting(false);
      return;
    }

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: selectedCustomer.id,
      title: "Booking Baru",
      message: `${service.name} dijadwalkan pada ${date} pukul ${time}. Kami akan mengabari jika status booking berubah.`,
      type: "booking",
      metadata: {
        booking_id: booking.id,
        status: "pending",
        source: "staff_quick_booking",
      },
    });

    if (notificationError) {
      console.error("Failed to create customer booking notification:", notificationError);
    }

    // Fire-and-forget: send WA confirmation to customer
    supabase.functions
      .invoke("notify-booking-status", {
        body: {
          booking_id: booking.id,
          user_id: selectedCustomer.id,
          title: "Booking Diterima",
          message: `Servis ${service.name} dijadwalkan ${date} pukul ${time}. Tim kami akan menghubungi Anda untuk konfirmasi.`,
          status_changed: true,
          payment_changed: false,
          new_status: "pending",
          new_payment_status: "unpaid",
        },
      })
      .catch((e) => console.warn("notify-booking-status failed:", e));

    toast({
      title: "Booking berhasil dibuat",
      description: `Notifikasi customer sudah dikirim untuk ${selectedCustomer.full_name || "customer"}.`,
    });

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Booking berhasil dibuat", {
        body: `${selectedCustomer.full_name || "Customer"} — ${service.name} (${date} ${time})`,
        icon: "/favicon.png",
      });
    }

    // If this customer was just created by admin (no password yet),
    // issue a one-time claim link instead of the public tracking link.
    let claimUrl: string | null = null;
    const publicToken = (booking as any).public_track_token ?? null;
    if (selectedCustomer.is_new) {
      try {
        const { data: claimData, error: claimErr } = await supabase.functions.invoke("admin-user-ops", {
          body: {
            action: "issue_claim_token",
            userId: selectedCustomer.id,
            bookingId: booking.id,
            bookingPublicToken: publicToken,
          },
        });
        if (!claimErr && claimData?.claim_token) {
          const origin = typeof window !== "undefined" ? window.location.origin : "https://bengkelstroban.com";
          claimUrl = `${origin}/claim/${claimData.claim_token}`;
        }
      } catch (e) {
        console.warn("issue_claim_token failed:", e);
      }
    }

    // Show share confirmation step instead of closing
    setCreatedBooking({
      id: booking.id,
      token: publicToken,
      claimUrl,
      isNewUser: Boolean(selectedCustomer.is_new),
      snapshot: {
        customerName: selectedCustomer.full_name || "Customer",
        customerPhone: selectedCustomer.phone,
        serviceName: service.name,
        date,
        time,
        branch: branches.find(b => b.slug === branch)?.name || branch,
        vehicleLabel: `${selectedVehicle.brand} ${selectedVehicle.model} • ${selectedVehicle.license_plate}`,
      },
    });
    setSubmitting(false);
  };

  const resetWizard = () => {
    setStep(1);
    setCustomerSearch("");
    setCustomers([]);
    setSelectedCustomer(null);
    setShowAddCustomer(false);
    setVehicles([]);
    setSelectedVehicle(null);
    setShowAddVehicle(false);
    setSelectedService("");
    setBranch("");
    setDate("");
    setTime("");
    setSelectedPromoId(null);
    setCreatedBooking(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            {createdBooking ? "Bagikan Link Tracking" : "Quick Booking"}
          </DialogTitle>
        </DialogHeader>

        {!createdBooking && <StepIndicator step={step} />}

        {createdBooking && (
          <BookingShareCard
            bookingId={createdBooking.id}
            token={createdBooking.token}
            claimUrl={createdBooking.claimUrl}
            isNewUser={createdBooking.isNewUser}
            customerName={createdBooking.snapshot.customerName}
            customerPhone={createdBooking.snapshot.customerPhone}
            serviceName={createdBooking.snapshot.serviceName}
            date={createdBooking.snapshot.date}
            time={createdBooking.snapshot.time}
            branch={createdBooking.snapshot.branch}
            vehicleLabel={createdBooking.snapshot.vehicleLabel}
            onClose={() => { resetWizard(); onOpenChange(false); }}
            onCreateAnother={resetWizard}
          />
        )}

        {!createdBooking && (
        <>

        {/* ── Step 1: Customer Search ───────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            {!showAddCustomer ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search customer by name or phone…"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                </div>
                {searchLoading && (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                )}
                {customers.length > 0 && (
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {customers.map(c => (
                      <Card
                        key={c.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md border",
                          selectedCustomer?.id === c.id
                            ? "border-primary/60 bg-primary/5 shadow-[0_0_10px_hsl(var(--primary)/0.15)]"
                            : "border-border"
                        )}
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{c.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || "—"}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {customerSearch.length >= 2 && !searchLoading && customers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddCustomer(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add New Customer
                </Button>
              </>
            ) : (
              <InlineAddCustomer
                onCreated={c => { setSelectedCustomer(c); setShowAddCustomer(false); }}
                onCancel={() => setShowAddCustomer(false)}
              />
            )}
            <div className="flex justify-end">
              <Button disabled={!selectedCustomer} onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Vehicle ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Customer: <span className="font-medium text-foreground">{selectedCustomer?.full_name}</span>
            </p>
            {!showAddVehicle ? (
              <>
                {vehiclesLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-muted-foreground text-sm">No vehicles found for this customer</p>
                    <Button size="sm" onClick={() => setShowAddVehicle(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Vehicle
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {vehicles.map(v => (
                      <Card
                        key={v.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md border",
                          selectedVehicle?.id === v.id
                            ? "border-primary/60 bg-primary/5 shadow-[0_0_10px_hsl(var(--primary)/0.15)]"
                            : "border-border"
                        )}
                        onClick={() => setSelectedVehicle(v)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Car className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{v.brand} {v.model} {v.year || ""}</p>
                            <p className="text-xs text-muted-foreground font-mono">{v.license_plate}</p>
                          </div>
                          {v.tire_size && <Badge variant="secondary" className="text-xs">{v.tire_size}</Badge>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {vehicles.length > 0 && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddVehicle(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add New Vehicle
                  </Button>
                )}
              </>
            ) : (
              <InlineAddVehicle
                customerId={selectedCustomer!.id}
                onCreated={() => { setShowAddVehicle(false); fetchVehicles(selectedCustomer!.id); }}
                onCancel={() => setShowAddVehicle(false)}
              />
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!selectedVehicle} onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Service & Schedule ───────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Service</Label>
              <Select value={selectedService} onValueChange={setSelectedService} disabled={servicesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={servicesLoading ? "Memuat layanan…" : "Pilih layanan"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {catalogServices.length === 0 && !servicesLoading ? (
                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                      Belum ada layanan aktif di katalog
                    </div>
                  ) : (
                    catalogServices.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — Rp {s.price.toLocaleString("id-ID")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branch} onValueChange={setBranch} disabled={isLocked}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2 min-w-0">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="grid gap-2 min-w-0">
                <Label>Time</Label>
                <Select value={time} onValueChange={setTime} disabled={!branch || !date || slotsLoading}>
                  <SelectTrigger className="min-w-0">
                    <SelectValue
                      className="truncate"
                      placeholder={!branch ? "Pilih cabang dulu" : !date ? "Pilih tanggal dulu" : slotsLoading ? "Memuat slot…" : "Pilih waktu"}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableSlots.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-muted-foreground text-center">Tidak ada slot tersisa hari ini</div>
                    ) : (
                      availableSlots.map(t => {
                        const info = slotInfo[t];
                        const status = info?.status ?? "available";
                        const remaining = info?.remaining ?? info?.max ?? 0;
                        const max = info?.max ?? 0;
                        const disabled = status !== "available";
                        return (
                          <SelectItem key={t} value={t} disabled={disabled}>
                            <span className="flex items-center justify-between gap-3 w-full">
                              <span>{t}</span>
                              <span className={cn(
                                "text-[10px] font-semibold",
                                status === "available" && "text-green-600",
                                status === "full" && "text-destructive",
                                status === "closed" && "text-muted-foreground",
                              )}>
                                {status === "closed" ? "Tutup" : status === "full" ? "Penuh" : `${remaining}/${max} sisa`}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button disabled={!selectedService || !branch || !date || !time} onClick={() => setStep(4)}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Promo ────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Promo Berjalan</p>
              <span className="text-xs text-muted-foreground">— opsional, untuk layanan {service?.name}</span>
            </div>

            {promosLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {/* No promo option */}
                <Card
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedPromoId === null && "ring-2 ring-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]",
                  )}
                  onClick={() => setSelectedPromoId(null)}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {selectedPromoId === null && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      <div>
                        <p className="text-sm font-medium">Tanpa Promo</p>
                        <p className="text-[11px] text-muted-foreground">Harga normal Rp {service?.price.toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {activePromos.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-4 border border-dashed rounded-lg">
                    Tidak ada promo berjalan yang berlaku untuk layanan ini.
                  </div>
                ) : (
                  activePromos.map(p => {
                    const calc = computeDiscount(p, service?.price || 0);
                    const active = selectedPromoId === p.id;
                    return (
                      <Card
                        key={p.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          active && "ring-2 ring-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]",
                        )}
                        onClick={() => setSelectedPromoId(p.id)}
                      >
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {active && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                              <p className="text-sm font-semibold truncate">{p.title}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {calc.label}
                            </Badge>
                          </div>
                          {p.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{p.description}</p>
                          )}
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                            <span className="text-muted-foreground">Hemat <span className="text-primary font-semibold">{formatRp(calc.discount)}</span></span>
                            <span className="font-semibold">Total: {formatRp(calc.finalPrice)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={() => setStep(5)}>{selectedPromoId ? "Pakai Promo & Lanjut" : "Lewati & Lanjut"}</Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Confirm ──────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{selectedCustomer?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{selectedCustomer?.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-medium">{selectedVehicle?.brand} {selectedVehicle?.model}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Plate</span><span className="font-mono">{selectedVehicle?.license_plate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{service?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span>{branches.find(b => b.slug === branch)?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{time}</span></div>
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>Rp {service?.price.toLocaleString("id-ID")}</span></div>
                  {selectedPromo && (
                    <div className="flex justify-between text-primary">
                      <span className="flex items-center gap-1.5"><Tag className="h-3 w-3" />Promo: {selectedPromo.title}</span>
                      <span>− {formatRp(pricing.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1">
                    <span>Total</span><span>{formatRp(pricing.finalPrice)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffQuickBookingDialog;
