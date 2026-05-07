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
import { useBranches } from "@/hooks/useBranches";

// ── Types ──────────────────────────────────────────────────────────────────
interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
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

const STEP_LABELS = ["Customer", "Vehicle", "Service & Schedule", "Confirm"];

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
    if (!name.trim() || !email.trim()) {
      toast({ variant: "destructive", title: "Name and Email are required" });
      return;
    }
    setSaving(true);
    // We create the user via admin edge function or just create a profile placeholder
    // For now, create a booking-only customer record by generating a UUID
    const tempId = crypto.randomUUID();
    const { error } = await supabase.from("profiles").insert({
      id: tempId,
      full_name: name.trim(),
      phone: phone.trim() || null,
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setSaving(false);
      return;
    }
    onCreated({ id: tempId, full_name: name.trim(), phone: phone.trim() || null, email: email.trim() });
    setSaving(false);
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <p className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> New Customer</p>
      <div className="grid gap-2">
        <Label>Name <span className="text-destructive">*</span></Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
      </div>
      <div className="grid gap-2">
        <Label>Email <span className="text-destructive">*</span></Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      </div>
      <div className="grid gap-2">
        <Label>Phone</Label>
        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
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
  const { branches } = useBranches();
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
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);
  const availableSlots = useMemo(
    () => filterFutureSlots(TIME_SLOTS, date || null, now),
    [date, now],
  );
  useEffect(() => {
    if (!time || !date) return;
    if (!isSameLocalDay(date, now)) return;
    const cutoff = now.getHours() * 60 + now.getMinutes() + 30;
    if (slotToMinutes(time) < cutoff) setTime("");
  }, [date, time, now]);

  // Step 4 – Submit
  const [submitting, setSubmitting] = useState(false);

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

  const service = SERVICES.find(s => s.id === selectedService);

  const handleConfirm = async () => {
    if (!selectedCustomer || !selectedVehicle || !service || !branch || !date || !time) return;
    setSubmitting(true);

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: selectedCustomer.id,
        vehicle_id: selectedVehicle.id,
        customer_name: selectedCustomer.full_name || "Walk-in",
        customer_email: selectedCustomer.email || "noemail@placeholder.com",
        customer_phone: selectedCustomer.phone || "",
        service_type: selectedService,
        service_name: service.name,
        service_price: service.price,
        service_duration: service.duration,
        booking_date: date,
        booking_time: time,
        branch,
        car_type: `${selectedVehicle.brand} ${selectedVehicle.model}`,
        car_plate_number: selectedVehicle.license_plate,
        status: "pending",
      })
      .select("id")
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

    toast({
      title: "Booking berhasil dibuat",
      description: `Notifikasi customer sudah dikirim untuk ${selectedCustomer.full_name || "customer"}.`,
    });

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Booking berhasil dibuat", {
        body: `${selectedCustomer.full_name || "Customer"} — ${service.name} (${date} ${time})`,
        icon: "/favicon.ico",
      });
    }

    onOpenChange(false);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Quick Booking
          </DialogTitle>
        </DialogHeader>

        <StepIndicator step={step} />

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
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedCustomer?.id === c.id && "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
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
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — Rp {s.price.toLocaleString("id-ID")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="grid gap-2">
                <Label>Time</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger>
                  <SelectContent>
                    {availableSlots.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-muted-foreground text-center">No slots left today</div>
                    ) : (
                      availableSlots.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button disabled={!selectedService || !branch || !date || !time} onClick={() => setStep(4)}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm ──────────────────────────────────────── */}
        {step === 4 && (
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
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span><span>Rp {service?.price.toLocaleString("id-ID")}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
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

export default StaffQuickBookingDialog;
