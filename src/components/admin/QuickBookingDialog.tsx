import { useState, useEffect } from "react";
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
import { Loader2, Car, Plus, CalendarCheck, ChevronRight, Tag, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterFutureSlots, isSameLocalDay, slotToMinutes, TIME_TICK_MS } from "@/lib/timeSlots";
import { useScopedBranches } from "@/hooks/useBranches";
import { useActivePromos, type ActivePromo } from "@/hooks/useActivePromos";
import { computeDiscount, formatRp } from "@/lib/promoDiscount";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string;
  tire_size: string | null;
}

interface QuickBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onAddVehicle: () => void;
}

const SERVICES = [
  { id: "tire_change", name: "Ganti Ban", price: 50000, duration: 30 },
  { id: "oil_change", name: "Ganti Oli", price: 150000, duration: 45 },
  { id: "wheel_alignment", name: "Spooring & Balancing", price: 200000, duration: 60 },
  { id: "tire_repair", name: "Tambal Ban", price: 30000, duration: 20 },
  { id: "nitrogen_fill", name: "Isi Nitrogen", price: 25000, duration: 15 },
  { id: "full_service", name: "Full Service", price: 500000, duration: 120 },
];

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
];

const QuickBookingDialog = ({
  open, onOpenChange, customerId, customerName, customerEmail, customerPhone, onAddVehicle,
}: QuickBookingDialogProps) => {
  const [step, setStep] = useState(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [branch, setBranch] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const { toast } = useToast();
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  useEffect(() => {
    if (isLocked && lockedBranch && branch !== lockedBranch) setBranch(lockedBranch);
  }, [isLocked, lockedBranch]);
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);
  const availableSlots = filterFutureSlots(TIME_SLOTS, date || null, now);
  useEffect(() => {
    if (!time || !date) return;
    if (!isSameLocalDay(date, now)) return;
    const cutoff = now.getHours() * 60 + now.getMinutes() + 30;
    if (slotToMinutes(time) < cutoff) setTime("");
  }, [date, time, now]);

  useEffect(() => {
    if (open && customerId) {
      setStep(1);
      setSelectedVehicle(null);
      setSelectedService("");
      setBranch("");
      setDate("");
      setTime("");
      setSelectedPromoId(null);
      fetchVehicles();
    }
  }, [open, customerId]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vehicles")
      .select("id, brand, model, year, license_plate, tire_size")
      .eq("user_id", customerId);
    setVehicles(data || []);
    setLoading(false);
  };

  const service = SERVICES.find((s) => s.id === selectedService);

  // Legacy hard-coded SERVICES: only show "all services" promos (no service-id/category targeting)
  const { promos: activePromos, loading: promosLoading } = useActivePromos({
    price: service?.price ?? null,
    allServicesOnly: true,
    enabled: !!service && step >= 3,
  });
  useEffect(() => {
    if (selectedPromoId && !activePromos.find(p => p.id === selectedPromoId)) {
      setSelectedPromoId(null);
    }
  }, [activePromos, selectedPromoId]);
  const selectedPromo: ActivePromo | null =
    activePromos.find(p => p.id === selectedPromoId) || null;
  const pricing = computeDiscount(selectedPromo, service?.price || 0);

  const handleConfirm = async () => {
    if (!selectedVehicle || !service || !branch || !date || !time) return;
    setSubmitting(true);

    const { data: authData } = await supabase.auth.getUser();
    const actorId = authData?.user?.id ?? null;

    const promoNote = selectedPromo
      ? `[Promo: ${selectedPromo.title} (-${formatRp(pricing.discount)})]`
      : null;

    const { error } = await supabase.from("bookings").insert({
      user_id: customerId,
      created_by: actorId,
      vehicle_id: selectedVehicle.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      service_type: selectedService,
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
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Booking created successfully" });
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Quick Booking — {customerName}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s}
              </div>
              {s < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            {step === 1 ? "Select Vehicle" : step === 2 ? "Service & Schedule" : step === 3 ? "Promo" : "Confirm"}
          </span>
        </div>

        {/* Step 1: Vehicle */}
        {step === 1 && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-muted-foreground">No vehicle found</p>
                <Button onClick={() => { onOpenChange(false); onAddVehicle(); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Vehicle
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                {vehicles.map((v) => (
                  <Card
                    key={v.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedVehicle?.id === v.id && "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
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
                <Button variant="outline" size="sm" className="mt-1" onClick={() => { onOpenChange(false); onAddVehicle(); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add New Vehicle
                </Button>
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={!selectedVehicle} onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 2: Service & Schedule */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Service</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — Rp {s.price.toLocaleString("id-ID")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branch} onValueChange={setBranch} disabled={isLocked}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2 min-w-0">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="grid gap-2 min-w-0">
                <Label>Time</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger className="min-w-0"><SelectValue className="truncate" placeholder="Time" /></SelectTrigger>
                  <SelectContent>
                    {availableSlots.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-muted-foreground text-center">No slots left today</div>
                    ) : (
                      availableSlots.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!selectedService || !branch || !date || !time} onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{customerName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-medium">{selectedVehicle?.brand} {selectedVehicle?.model}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Plate</span><span className="font-mono">{selectedVehicle?.license_plate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{service?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span>{branches.find((b) => b.slug === branch)?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{time}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span><span>Rp {service?.price.toLocaleString("id-ID")}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickBookingDialog;
