import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, Clock, CheckCircle2, ArrowLeft, Phone, Car, Wrench, MapPin,
  Hourglass, X, Wifi, WifiOff, CreditCard, Bell, Sparkles, AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import BookingQRCard from "@/components/booking/BookingQRCard";
import { buildWhatsAppUrl, handleWhatsAppNavigation } from "@/lib/whatsapp";
import { PICKUP_STATUS_LABEL } from "@/lib/pickupSettings";

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
  service_location?: string | null;
  pickup_address?: string | null;
  pickup_distance_km?: number | null;
  pickup_fee?: number | null;
  pickup_return?: boolean | null;
  pickup_return_fee?: number | null;
  pickup_status?: string | null;
}

const BRANCH_PHONE = "628973700800";

const STATUS_STEPS = [
  { key: "pending", label: "Diterima", icon: Hourglass, color: "bg-muted-foreground" },
  { key: "confirmed", label: "Dikonfirmasi", icon: Bell, color: "bg-blue-500" },
  { key: "checked_in", label: "Check-In", icon: Car, color: "bg-primary" },
  { key: "in_progress", label: "Dikerjakan", icon: Wrench, color: "bg-orange-500" },
  { key: "completed", label: "Selesai", icon: CheckCircle2, color: "bg-emerald-500" },
];

const formatDateID = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const formatIDR = (n: number) => {
  if (!n || n <= 0) return "FREE";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
};

const getStepIndex = (status: string) => {
  // Map legacy waiting_confirmation -> Diterima (step 0)
  if (status === "waiting_confirmation") return 0;
  if (status === "finishing") return 3; // legacy -> Dikerjakan
  const i = STATUS_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
};

const isUnpaid = (b: BookingRow) =>
  ["unpaid", "pending_payment", "pay_later", "pending"].includes(b.payment_status) &&
  !["cancelled", "completed"].includes(b.status);

// Pembayaran baru bisa dilakukan setelah staff konfirmasi booking.
// Untuk pelanggan yang memilih bayar di tempat (pay_later), tombol tetap
// muncul saat check-in & seterusnya agar bisa diselesaikan di kasir/online.
const canPayNow = (b: BookingRow) => {
  if (!isUnpaid(b)) return false;
  const status = b.status;
  if (status === "confirmed") return true;
  if (["checked_in", "in_progress", "finishing"].includes(status)) return true;
  return false;
};

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
    if (!canPayNow(booking)) {
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
          "id, user_id, service_name, service_price, booking_date, booking_time, branch, car_type, car_plate_number, status, payment_status, cancel_requested, cancel_reason, created_at, service_location, pickup_address, pickup_distance_km, pickup_fee, pickup_return, pickup_return_fee, pickup_status"
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
        <div className="container mx-auto px-4 pt-3 md:pt-4 pb-20 max-w-2xl">
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
  // Can request cancel (with staff approval) any time before terminal state
  // Only allow cancel request once booking has been confirmed (or is being worked on).
  const canRequestCancel = ["confirmed", "in_progress", "checked_in", "finishing"].includes(booking.status);
  const unpaid = isUnpaid(booking);
  const payAllowed = canPayNow(booking);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 pt-3 md:pt-4 pb-20 max-w-3xl">
        <div className="flex items-center justify-end mb-3">
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

        <div className="space-y-5">
          {/* QR for cashier / check-in — shown when payment awaits confirmation OR booking is confirmed (siap di-scan admin cabang untuk check-in) */}
          {isOwner &&
            !["checked_in", "in_progress", "completed", "cancelled"].includes(booking.status) &&
            (
              booking.status === "confirmed" ||
              ["awaiting_confirmation", "pay_later"].includes(booking.payment_status)
            ) && (
              <BookingQRCard bookingId={booking.id} amount={booking.service_price} />
          )}

          {/* Hero card */}
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-7 sm:p-9 shadow-sm">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
                  <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.75} />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                  Status Booking
                </p>
                <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight leading-tight">
                  {booking.service_name}
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  {formatDateID(booking.booking_date)} · {booking.booking_time}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-7 space-y-4">
              <Progress value={progressPct} className="h-1.5" />
              <div className="grid grid-cols-5 gap-1">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const done = idx < stepIdx;
                  const active = idx === stepIdx && booking.status !== "cancelled";
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                          active
                            ? `${step.color} text-white shadow-md shadow-primary/20`
                            : done
                            ? `${step.color} text-white`
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </div>
                      <span
                        className={`text-[10px] sm:text-[11px] leading-none tracking-tight text-center ${
                          active ? "text-foreground font-medium" : done ? "text-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Payment card */}
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl overflow-hidden shadow-sm">
            <div className="p-6 flex items-baseline justify-between">
              <span className="text-[13px] text-muted-foreground">Total Tagihan</span>
              <span className="text-[22px] font-semibold tracking-tight tabular-nums">
                {formatIDR(booking.service_price)}
              </span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between border-t border-border/40">
              <span className="text-[13px] text-muted-foreground">Status Pembayaran</span>
              {booking.payment_status === "paid" ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border font-medium">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Lunas
                </Badge>
              ) : booking.payment_status === "failed" ? (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 border font-medium">
                  Gagal
                </Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary border-primary/20 border font-medium">
                  <Clock className="h-3 w-3 mr-1" /> Belum Lunas
                </Badge>
              )}
            </div>
            {unpaid && isOwner && booking.status !== "cancelled" && (
              <div className="px-6 pb-6 pt-2">
                <Button
                  onClick={() => setShowPayment(true)}
                  disabled={!payAllowed}
                  className="w-full gap-2 rounded-full h-11 font-medium"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4" />
                  {payAllowed ? "Bayar Sekarang" : "Menunggu Konfirmasi"}
                </Button>
                {!payAllowed && (
                  <p className="text-[11.5px] text-muted-foreground text-center mt-3 leading-relaxed">
                    Pembayaran dapat dilakukan setelah booking dikonfirmasi admin. Untuk bayar di tempat,
                    pembayaran tetap bisa diselesaikan saat check-in di kasir bengkel.
                  </p>
                )}
                {payAllowed && booking.payment_status === "pay_later" && (
                  <p className="text-[11.5px] text-muted-foreground text-center mt-3 leading-relaxed">
                    Anda memilih bayar di tempat. Silakan bayar di kasir saat check-in, atau bayar online sekarang.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Detail card — Apple-style list rows */}
          <div className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl overflow-hidden shadow-sm">
            <DetailRow icon={Car} label="Kendaraan">
              <div className="text-right">
                <p className="text-[14px] font-medium leading-tight">{booking.car_type || "—"}</p>
                {booking.car_plate_number && (
                  <p className="text-[11px] font-mono uppercase text-muted-foreground mt-0.5">
                    {booking.car_plate_number}
                  </p>
                )}
              </div>
            </DetailRow>
            <DetailRow icon={MapPin} label="Cabang">
              <span className="text-[14px] font-medium capitalize">{booking.branch || "—"}</span>
            </DetailRow>
            <DetailRow icon={Clock} label="Jadwal">
              <span className="text-[14px] font-medium">
                {formatDateID(booking.booking_date)} · {booking.booking_time}
              </span>
            </DetailRow>
            <DetailRow icon={Wrench} label="Booking ID" last>
              <span className="text-[12px] font-mono text-muted-foreground">
                {booking.id.slice(0, 8).toUpperCase()}
              </span>
            </DetailRow>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Button asChild variant="outline" className="rounded-full h-11 gap-2 font-medium">
                <a
                  href={buildWhatsAppUrl({
                    phone: BRANCH_PHONE,
                    text: `Halo, saya mau menanyakan booking ${booking.id.slice(0, 8).toUpperCase()}`,
                  })}
                  onClick={(event) =>
                    handleWhatsAppNavigation(event, {
                      phone: BRANCH_PHONE,
                      text: `Halo, saya mau menanyakan booking ${booking.id.slice(0, 8).toUpperCase()}`,
                    })
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4" /> Hubungi
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full h-11 font-medium">
                <Link to="/profile/history-perawatan">Riwayat</Link>
              </Button>
            </div>
            {canRequestCancel && isOwner && (
              <Button
                variant="ghost"
                className="w-full gap-2 rounded-full h-11 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
                onClick={() => setCancelOpen(true)}
                disabled={booking.cancel_requested}
              >
                <X className="h-4 w-4" />
                {booking.cancel_requested ? "Permintaan Pembatalan Terkirim" : "Ajukan Pembatalan"}
              </Button>
            )}
          </div>

          {!isOwner && (
            <p className="text-[12px] text-muted-foreground text-center">
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
          bookingStatus={booking.status}
        />
      )}
    </div>
  );
};

export default MyBooking;

function DetailRow({
  icon: Icon,
  label,
  children,
  last,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-6 py-4 ${
        last ? "" : "border-b border-border/40"
      }`}
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
      <span className="text-[13px] text-muted-foreground flex-1">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
