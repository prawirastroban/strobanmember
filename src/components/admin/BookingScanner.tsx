import { useState, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ScanLine, Loader2, AlertCircle, CheckCircle2, User, Car, Calendar,
  MapPin, Wrench, CreditCard, Banknote, QrCode, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BookingRow {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  branch: string | null;
  car_type: string | null;
  car_plate_number: string | null;
  status: string;
  payment_status: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => format(new Date(d), "dd MMM yyyy");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const METHODS = [
  { value: "pay_at_workshop", label: "Cash di Tempat", icon: Banknote },
  { value: "transfer", label: "Transfer Bank", icon: CreditCard },
  { value: "qris", label: "QRIS", icon: QrCode },
];

const BookingScanner = () => {
  const { isAdminCabang, userBranch } = useUserRole();
  const [scanning, setScanning] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState("pay_at_workshop");
  const [confirming, setConfirming] = useState(false);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);

  const reset = () => {
    setBooking(null);
    setPayment(null);
    setError(null);
    setManualInput("");
    setMethod("pay_at_workshop");
    setScanning(true);
    lastScanRef.current = null;
  };

  const resolve = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setBooking(null);
    setPayment(null);
    setScanning(false);
    try {
      let query = supabase.from("bookings").select("*");
      if (UUID_RE.test(value)) {
        query = query.eq("id", value);
      } else if (/^[0-9a-f]{6,8}$/i.test(value)) {
        query = query.ilike("id", value.toLowerCase() + "%");
      } else {
        throw new Error("Format kode tidak dikenali");
      }
      const { data, error: err } = await query.limit(2);
      if (err) throw err;
      if (!data || data.length === 0) throw new Error("Booking tidak ditemukan");
      if (data.length > 1) throw new Error("Kode ambigu, gunakan kode lengkap");
      const b = data[0] as BookingRow;

      if (isAdminCabang && userBranch && b.branch !== userBranch) {
        throw new Error(`Booking ini untuk cabang ${b.branch ?? "-"}, bukan cabang Anda (${userBranch}).`);
      }

      setBooking(b);

      // Look for existing payment row
      const { data: pays } = await supabase
        .from("payments")
        .select("id, amount, payment_method, payment_status")
        .eq("booking_id", b.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (pays && pays.length > 0) {
        const p = pays[0] as PaymentRow;
        setPayment(p);
        if (p.payment_method && p.payment_method !== "midtrans") setMethod(p.payment_method);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat booking");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (results: Array<{ rawValue: string }>) => {
    if (!results || results.length === 0) return;
    const v = results[0].rawValue;
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.value === v && now - lastScanRef.current.at < 2000) return;
    lastScanRef.current = { value: v, at: now };
    resolve(v);
  };

  const handleConfirm = async () => {
    if (!booking) return;
    setConfirming(true);
    try {
      // Step 1: Update booking status to checked_in (if not already past it)
      const needsCheckIn = ["pending", "waiting_confirmation", "confirmed"].includes(booking.status);
      if (needsCheckIn) {
        const { error: upErr } = await supabase
          .from("bookings")
          .update({ status: "checked_in" })
          .eq("id", booking.id);
        if (upErr) throw upErr;
      }

      // Step 2: Handle payment confirmation (skips if already paid)
      if (booking.payment_status === "paid") {
        toast.success(needsCheckIn ? "Customer berhasil Check-In" : "Status terverifikasi");
        reset();
        setConfirming(false);
        return;
      }

      let paymentId = payment?.id;

      // If no payment row yet, create one (admin acts on behalf of customer at counter)
      if (!paymentId) {
        const { data: ins, error: insErr } = await supabase
          .from("payments")
          .insert({
            booking_id: booking.id,
            user_id: booking.user_id,
            amount: booking.service_price,
            payment_method: method,
            payment_status: "pending",
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        paymentId = (ins as { id: string }).id;
      } else if (payment && payment.payment_method !== method) {
        // Update method before confirming
        await supabase.from("payments").update({ payment_method: method }).eq("id", payment.id);
      }

      const { data, error: rpcErr } = await supabase.rpc("confirm_manual_payment", {
        _payment_id: paymentId,
      });
      if (rpcErr) throw rpcErr;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "Gagal konfirmasi");

      toast.success("Check-In & pembayaran berhasil dikonfirmasi");
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal konfirmasi pembayaran");
    } finally {
      setConfirming(false);
    }
  };

  const handlePayLater = async () => {
    if (!booking) return;
    setConfirming(true);
    try {
      // Check-in customer + mark payment as pay_later
      const needsCheckIn = ["pending", "waiting_confirmation", "confirmed"].includes(booking.status);
      const updates: Record<string, string> = { payment_status: "pay_later" };
      if (needsCheckIn) updates.status = "checked_in";
      const { error: upErr } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", booking.id);
      if (upErr) throw upErr;
      toast.success("Customer check-in. Pembayaran ditunda hingga servis selesai.");
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menandai bayar nanti");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 px-1 sm:px-0">
      {scanning && !booking && !loading && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ScanLine className="h-4 w-4 text-primary" />
              Arahkan kamera ke QR booking customer
            </div>
            <div className="rounded-xl overflow-hidden border bg-black aspect-square max-w-md mx-auto">
              <Scanner
                onScan={handleScan}
                constraints={{ facingMode: "environment" }}
                styles={{ container: { width: "100%", height: "100%" } }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Atau ketik kode manual</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Mis. 7FE08A42 atau UUID lengkap"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && resolve(manualInput)}
                />
                <Button onClick={() => resolve(manualInput)} disabled={!manualInput.trim()}>
                  Cari
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Memuat booking...</p>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card className="border-destructive/40">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-destructive">Tidak bisa diproses</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={reset} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" /> Scan Ulang
            </Button>
          </CardContent>
        </Card>
      )}

      {booking && !loading && (
        <Card>
          <CardContent className="p-4 sm:p-5 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Booking</p>
                <p className="font-mono font-semibold text-sm sm:text-base">{booking.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <Badge variant="outline" className="capitalize text-[10px] sm:text-xs">{booking.status.replace("_", " ")}</Badge>
            </div>

            <div className="space-y-2 text-sm">
              <Row icon={User} label="Customer" value={`${booking.customer_name} · ${booking.customer_phone}`} />
              <Row icon={Wrench} label="Layanan" value={booking.service_name} />
              <Row icon={Car} label="Kendaraan" value={`${booking.car_type ?? "-"} · ${booking.car_plate_number ?? "-"}`} />
              <Row icon={Calendar} label="Jadwal" value={`${formatDate(booking.booking_date)} · ${booking.booking_time}`} />
              <Row icon={MapPin} label="Cabang" value={booking.branch ?? "-"} className="capitalize" />
            </div>

            <div className="rounded-xl border bg-muted/30 p-3 sm:p-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Tagihan</p>
                <p className="text-lg sm:text-xl font-semibold tabular-nums">{formatIDR(booking.service_price)}</p>
              </div>
              {booking.payment_status === "paid" ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Sudah Lunas
                </Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border border-primary/30">Belum Lunas</Badge>
              )}
            </div>

            {booking.payment_status === "paid" ? (
              <div className="text-center text-sm text-muted-foreground">
                Pembayaran untuk booking ini sudah dikonfirmasi sebelumnya.
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Metode Pembayaran</Label>
                <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-1 gap-2">
                  {METHODS.map((m) => (
                    <Label
                      key={m.value}
                      htmlFor={`pm-${m.value}`}
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border cursor-pointer hover:bg-muted/40 has-[:checked]:ring-2 has-[:checked]:ring-primary/50 has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={m.value} id={`pm-${m.value}`} />
                      <m.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{m.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {booking.payment_status !== "paid" ? (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                <Button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="col-span-2 sm:flex-1 gap-1.5 text-xs sm:text-sm whitespace-nowrap"
                >
                  {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Check-In &amp; Bayar
                </Button>
                <Button variant="secondary" onClick={handlePayLater} disabled={confirming} className="gap-1.5 text-xs sm:text-sm sm:flex-1">
                  Bayar Nanti
                </Button>
                <Button variant="outline" onClick={reset} className="gap-1.5 text-xs sm:text-sm sm:flex-1">
                  <RefreshCw className="h-4 w-4" /> Scan Lagi
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                <Button onClick={handleConfirm} disabled={confirming} className="col-span-2 sm:flex-1 gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                  {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Check-In Customer
                </Button>
                <Button variant="outline" onClick={reset} className="col-span-2 sm:flex-1 gap-1.5 text-xs sm:text-sm">
                  <RefreshCw className="h-4 w-4" /> Scan Lagi
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function Row({
  icon: Icon, label, value, className,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-16 sm:w-20 shrink-0">{label}</span>
      <span className={`text-[13px] sm:text-sm font-medium flex-1 min-w-0 truncate ${className ?? ""}`}>{value}</span>
    </div>
  );
}

export default BookingScanner;