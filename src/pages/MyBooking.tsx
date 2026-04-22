import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, Clock, CheckCircle2, ArrowLeft, Phone, Car, Wrench, MapPin,
  Hourglass, X, Wifi, WifiOff, CreditCard, Bell, Sparkles, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import PaymentDialog from "@/components/PaymentDialog";

interface BookingRow {
  id: string;
  user_id: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  branch: string | null;
  car_type: string | null;
  car_plate_number: string | null;
  status: string;
  payment_status: string;
  cancel_requested: boolean;
  cancel_reason: string | null;
  created_at: string;
}

const BRANCH_PHONE = "628973700800";

const STATUS_STEPS = [
  { key: "pending", label: "Pending", icon: Hourglass, color: "bg-muted-foreground" },
  { key: "waiting_confirmation", label: "Menunggu", icon: Clock, color: "bg-primary" },
  { key: "confirmed", label: "Dikonfirmasi", icon: Bell, color: "bg-blue-500" },
  { key: "in_progress", label: "Pengerjaan", icon: Wrench, color: "bg-orange-500" },
  { key: "completed", label: "Selesai", icon: CheckCircle2, color: "bg-emerald-500" },
];

const formatDateID = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const getStepIndex = (status: string) => {
  const i = STATUS_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
};

const isUnpaid = (b: BookingRow) =>
  ["unpaid", "pending_payment", "pay_later", "pending"].includes(b.payment_status) &&
  !["cancelled", "completed"].includes(b.status);

const MyBooking = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeOk, setRealtimeOk] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const navigatedRef = useRef(false);
  const autoPayTriggeredRef = useRef(false);

  // Auto-open payment dialog when redirected from booking confirmation with ?pay=1
  useEffect(() => {
    if (autoPayTriggeredRef.current) return;
    if (!booking) return;
    if (searchParams.get("pay") !== "1") return;
    if (!isUnpaid(booking)) {
      searchParams.delete("pay");
      setSearchParams(searchParams, { replace: true });
      return;
    }
    autoPayTriggeredRef.current = true;
    setShowPayment(true);
    searchParams.delete("pay");
    setSearchParams(searchParams, { replace: true });
  }, [booking, searchParams, setSearchParams]);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, user_id, service_name, service_price, booking_date, booking_time, branch, car_type, car_plate_number, status, payment_status, cancel_requested, cancel_reason, created_at"
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error("Booking tidak ditemukan");
        navigate("/profile/history-perawatan");
        return;
      }
      setBooking(data as BookingRow);
      setLoading(false);

      if (data.status === "completed" && !navigatedRef.current) {
        navigatedRef.current = true;
        setTimeout(() => navigate(`/service/completed/${bookingId}`, { replace: true }), 1200);
      }
    };
    fetchOnce();

    const channel = supabase
      .channel(`my-booking-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload) => {
          setBooking(payload.new as BookingRow);
          const next = payload.new as BookingRow;
          if (next.status === "completed" && !navigatedRef.current) {
            navigatedRef.current = true;
            toast.success("Servis selesai! 🎉");
            setTimeout(() => navigate(`/service/completed/${bookingId}`, { replace: true }), 1200);
          }
        }
      )
      .subscribe((status) => {
        setRealtimeOk(status === "SUBSCRIBED");
      });

    const poll = setInterval(fetchOnce, 5000);

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [bookingId, navigate]);

  const handleRequestCancel = async () => {
    if (!booking || !cancelReason.trim()) {
      toast.error("Mohon isi alasan pembatalan");
      return;
    }
    setCancelling(true);
    const { data, error } = await supabase.rpc("request_booking_cancellation", {
      _booking_id: booking.id,
      _reason: cancelReason.trim(),
    });
    setCancelling(false);
    setCancelOpen(false);
    setCancelReason("");
    if (error || (data && !(data as { success: boolean }).success)) {
      const msg = (data as { error?: string })?.error || error?.message || "Gagal";
      toast.error("Gagal mengirim permintaan: " + msg);
      return;
    }
    toast.success("Permintaan pembatalan terkirim. Menunggu persetujuan staff.");
  };

  if (loading || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 pb-20 max-w-2xl">
          <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-12 text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="font-semibold">Memuat status booking...</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === booking.user_id;
  const stepIdx = getStepIndex(booking.status);
  const progressPct = booking.status === "cancelled" ? 0 : Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100);
  const canModify = ["pending", "waiting_confirmation"].includes(booking.status);
  const unpaid = isUnpaid(booking);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-20 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/profile/history-perawatan"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Riwayat Perawatan
          </Link>
          <div className="flex items-center gap-1.5 text-xs">
            {realtimeOk ? (
              <><Wifi className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">Live</span></>
            ) : (
              <><WifiOff className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Polling</span></>
            )}
          </div>
        </div>

        {/* Cancel-requested banner */}
        {booking.cancel_requested && booking.status !== "cancelled" && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-primary dark:text-primary">Permintaan pembatalan terkirim</p>
              <p className="text-muted-foreground mt-1">
                Menunggu persetujuan staff/admin. Anda akan menerima notifikasi setelah ditinjau.
              </p>
              {booking.cancel_reason && (
                <p className="text-xs mt-2 italic">Alasan: "{booking.cancel_reason}"</p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Hero */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center border border-primary/40">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 gap-1 border">
                Status Booking
              </Badge>
              <h1 className="text-2xl font-bold">{booking.service_name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDateID(booking.booking_date)} · {booking.booking_time}
                {booking.branch && ` · ${booking.branch}`}
              </p>
            </div>
          </div>

          {/* Progress (mirip LiveProgressTracker beranda) */}
          <div className="space-y-3">
            <Progress value={progressPct} className="h-2" />
            <div className="grid grid-cols-5 gap-1">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = idx < stepIdx;
                const active = idx === stepIdx && booking.status !== "cancelled";
                return (
                  <div key={step.key} className="flex flex-col items-center text-center gap-1">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all ${
                        active
                          ? `${step.color} text-white border-transparent ring-2 ring-offset-2 ring-offset-background ring-primary animate-pulse shadow-lg`
                          : done
                          ? `${step.color} text-white border-transparent`
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs leading-tight ${
                        active ? "text-primary font-semibold" : done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment summary */}
          <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Tagihan</p>
              <p className="text-xl font-bold text-primary">{formatIDR(booking.service_price)}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status Pembayaran</span>
              {booking.payment_status === "paid" ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Lunas
                </Badge>
              ) : booking.payment_status === "failed" ? (
                <Badge className="bg-red-500/15 text-red-600 border-red-500/30 border">Gagal</Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/30 border">
                  <Clock className="h-3 w-3 mr-1" /> Belum Lunas
                </Badge>
              )}
            </div>
            {unpaid && isOwner && booking.status !== "cancelled" && (
              <Button
                onClick={() => setShowPayment(true)}
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
                size="lg"
              >
                <CreditCard className="h-4 w-4" /> Bayar Sekarang
              </Button>
            )}
            {booking.payment_status === "pay_later" && (
              <p className="text-xs text-muted-foreground text-center">
                Anda memilih bayar di tempat. Silakan datang sesuai jadwal atau bayar online sekarang.
              </p>
            )}
          </div>

          {/* Booking detail */}
          <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Kendaraan</span>
                <span className="font-medium text-right">
                  {booking.car_type || "—"}
                  {booking.car_plate_number && (
                    <span className="block text-xs font-mono uppercase text-muted-foreground">
                      {booking.car_plate_number}
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Cabang</span>
                <span className="font-medium capitalize text-right">{booking.branch || "—"}</span>
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/50">
              <span className="text-muted-foreground">Booking ID</span>
              <span className="font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline" className="flex-1 gap-2">
                <a
                  href={`https://wa.me/${BRANCH_PHONE}?text=Halo%2C%20saya%20mau%20menanyakan%20booking%20${booking.id.slice(0, 8).toUpperCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4" /> Hubungi Bengkel
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/profile/history-perawatan">Lihat Semua Riwayat</Link>
              </Button>
            </div>
            {canModify && isOwner && !booking.cancel_requested && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setCancelOpen(true)}
              >
                <X className="h-4 w-4" /> Ajukan Pembatalan
              </Button>
            )}
          </div>

          {!isOwner && (
            <p className="text-xs text-muted-foreground text-center">
              Anda melihat status booking pengguna lain.
            </p>
          )}
        </div>
      </div>

      {/* Cancel request dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={(o) => { setCancelOpen(o); if (!o) setCancelReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajukan pembatalan booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Permintaan ini akan dikirim ke staff/admin untuk persetujuan. Booking belum
              dibatalkan sampai mereka menyetujui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Alasan pembatalan <span className="text-destructive">*</span></Label>
            <Textarea
              id="cancel-reason"
              placeholder="Contoh: Ada keperluan mendadak, ingin ganti tanggal, dll."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">{cancelReason.length}/300</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Tidak</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestCancel}
              disabled={cancelling || !cancelReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Mengirim..." : "Kirim Permintaan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment dialog */}
      {booking && (
        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          bookingId={booking.id}
          amount={booking.service_price}
          serviceName={booking.service_name}
        />
      )}
    </div>
  );
};

export default MyBooking;
