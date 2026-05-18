import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, Clock, CheckCircle2, ArrowLeft, Phone, Car, Wrench, MapPin, Hourglass, X, Wifi, WifiOff, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getBookingStatusMeta } from "@/lib/bookingStatus";
import { WaitingConfirmationPanel } from "@/components/booking/WaitingConfirmationPanel";
import { buildWhatsAppUrl, handleWhatsAppNavigation } from "@/lib/whatsapp";

interface BookingRow {
  id: string;
  user_id: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  branch: string | null;
  car_type: string | null;
  car_plate_number: string | null;
  status: string;
  service_status: string;
  payment_status: string;
  created_at: string;
  cancel_requested?: boolean;
  cancel_reason?: string | null;
}

const BRANCH_PHONES: Record<string, string> = {
  bandung: "628973700800",
  tasikmalaya: "628973700800",
  cirebon: "628973700800",
  yogyakarta: "628973700800",
};

const PROGRESS_STEPS = [
  { key: "pending", label: "Pending", icon: Hourglass },
  { key: "waiting_confirmation", label: "Menunggu", icon: Clock },
  { key: "confirmed", label: "Konfirmasi", icon: CheckCircle2 },
  { key: "in_progress", label: "Pengerjaan", icon: Wrench },
  { key: "completed", label: "Selesai", icon: CheckCircle2 },
] as const;

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
];

const formatDateID = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const getStepIndex = (status: string) => {
  const i = PROGRESS_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const slotToMinutes = (slot: string) => {
  const [time, period] = slot.split(" ");
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

const BookingStatus = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now());

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule dialog
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    const handleUpdate = (next: BookingRow) => {
      setBooking(next);
      setLastUpdatedAt(Date.now());
      if (
        !navigatedRef.current &&
        ["confirmed", "in_progress"].includes(next.status)
      ) {
        navigatedRef.current = true;
        toast.success("Bengkel sudah konfirmasi! Mengarahkan ke progress servis...");
        setTimeout(() => navigate(`/service/progress/${bookingId}`, { replace: true }), 800);
      }
      // Redirect unpaid/pay_later bookings to new MyBooking page
      if (
        !navigatedRef.current &&
        ["pending", "waiting_confirmation"].includes(next.status) &&
        ["unpaid", "pay_later", "pending_payment"].includes(next.payment_status)
      ) {
        navigatedRef.current = true;
        setTimeout(() => navigate(`/my-booking/${bookingId}`, { replace: true }), 100);
      }
    };

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, user_id, service_name, booking_date, booking_time, branch, car_type, car_plate_number, status, service_status, payment_status, created_at, cancel_requested, cancel_reason"
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error("Booking tidak ditemukan");
        navigate("/profile/history-perawatan");
        return;
      }
      handleUpdate(data as BookingRow);
      setLoading(false);
    };
    fetchOnce();

    const channel = supabase
      .channel(`booking-status-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload) => handleUpdate(payload.new as BookingRow)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeOk(true);
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")
          setRealtimeOk(false);
      });

    const poll = setInterval(fetchOnce, 3000);

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [bookingId, navigate]);

  const handleCancel = async () => {
    if (!booking) return;
    if (!cancelReason.trim()) {
      toast.error("Mohon isi alasan pembatalan");
      return;
    }
    setCancelling(true);
    // Use staff-approval workflow (consistent with MyBooking page)
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

  const openReschedule = () => {
    if (!booking) return;
    setNewDate(booking.booking_date);
    setNewTime(booking.booking_time);
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!booking) return;
    if (!newDate || !newTime) {
      toast.error("Pilih tanggal dan jam baru");
      return;
    }
    // Block past date/time (with 1h buffer if today)
    const today = todayISO();
    if (newDate < today) {
      toast.error("Tanggal tidak boleh sebelum hari ini");
      return;
    }
    if (newDate === today) {
      const now = new Date();
      const minMin = now.getHours() * 60 + now.getMinutes() + 60;
      if (slotToMinutes(newTime) < minMin) {
        toast.error("Pilih jam minimal 1 jam dari sekarang");
        return;
      }
    }
    if (newDate === booking.booking_date && newTime === booking.booking_time) {
      toast.error("Tanggal dan jam tidak berubah");
      return;
    }

    setRescheduling(true);
    const oldDate = booking.booking_date;
    const oldTime = booking.booking_time;
    const { error } = await supabase
      .from("bookings")
      .update({ booking_date: newDate, booking_time: newTime })
      .eq("id", booking.id);

    if (!error) {
      await supabase.from("activity_logs").insert({
        type: "booking",
        description: `Booking rescheduled by customer: ${booking.service_name}`,
        user_id: booking.user_id,
        metadata: {
          booking_id: booking.id,
          action: "reschedule",
          from: { date: oldDate, time: oldTime },
          to: { date: newDate, time: newTime },
          rescheduled_at: new Date().toISOString(),
        },
      });
    }

    setRescheduling(false);
    setRescheduleOpen(false);
    if (error) {
      toast.error("Gagal reschedule: " + error.message);
      return;
    }
    toast.success("Jadwal booking berhasil diubah");
  };

  if (loading || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <div className="container mx-auto px-4 pt-3 md:pt-4 pb-20 max-w-2xl">
          <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-12 shadow-2xl text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="font-semibold">Memuat status booking...</p>
            <p className="text-sm text-muted-foreground">
              Sedang menyinkronkan data dengan bengkel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === booking.user_id;
  const meta = getBookingStatusMeta(booking.status);
  const stepIdx = getStepIndex(booking.status);
  const progressPct = booking.status === "cancelled"
    ? 0
    : Math.round(((stepIdx + 1) / PROGRESS_STEPS.length) * 100);
  const branchKey = (booking.branch ?? "").toLowerCase();
  const phone = BRANCH_PHONES[branchKey] ?? "628973700800";
  const canModify = ["pending", "waiting_confirmation"].includes(booking.status);
  const canRequestCancel = !["completed", "cancelled"].includes(booking.status) && !booking.cancel_requested;

  // Filter slots when rescheduling for today
  const isReschedToday = newDate === todayISO();
  const nowMinPlusBuffer = (() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes() + 60;
  })();
  const availableSlots = isReschedToday
    ? TIME_SLOTS.filter((s) => slotToMinutes(s) >= nowMinPlusBuffer)
    : TIME_SLOTS;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto px-4 pt-3 md:pt-4 pb-20 max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1.5 text-xs">
            {realtimeOk ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Polling</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Hero status */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
                <Clock className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Badge className={`${meta.badgeClass} gap-1 border`}>
                <CheckCircle2 className="h-3 w-3" /> {meta.label}
              </Badge>
              <h1 className="text-2xl font-bold">{meta.label}</h1>
              <p className="text-sm text-muted-foreground max-w-md">{meta.description}</p>
              {booking.status === "waiting_confirmation" && (
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary font-medium">
                  <Hourglass className="h-3.5 w-3.5 animate-pulse" />
                  Estimasi konfirmasi: 5–15 menit
                </div>
              )}
            </div>
          </div>

          {booking.status === "waiting_confirmation" && (
            <WaitingConfirmationPanel
              bookingId={booking.id}
              branch={booking.branch}
              bookingDate={booking.booking_date}
              lastUpdatedAt={lastUpdatedAt}
            />
          )}

          {/* Progress bar */}
          <div className="space-y-3">
            <Progress value={progressPct} className="h-2" />
            <div className="grid grid-cols-5 gap-1">
              {PROGRESS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = idx < stepIdx;
                const active = idx === stepIdx && booking.status !== "cancelled";
                return (
                  <div key={step.key} className="flex flex-col items-center text-center gap-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${
                        active
                          ? "bg-primary text-primary-foreground border-primary animate-pulse shadow-lg shadow-primary/30"
                          : done
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs leading-tight whitespace-nowrap ${
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

          {/* Booking detail */}
          <div className="rounded-2xl bg-muted/40 border border-border/50 p-5 space-y-3 text-left">
            <div className="flex items-start gap-3 text-sm">
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
            <div className="flex items-start gap-3 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Layanan</span>
                <span className="font-medium text-right">{booking.service_name}</span>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Waktu Booking</span>
                <span className="font-medium text-right">
                  {formatDateID(booking.booking_date)} · {booking.booking_time}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Cabang</span>
                <span className="font-medium capitalize text-right">{booking.branch || "—"}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border/50">
              <span className="text-muted-foreground">Booking ID</span>
              <span className="font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline" className="flex-1 gap-2">
                <a
                  href={buildWhatsAppUrl({
                    phone,
                    text: `Halo Bengkel Stroban, saya mau menanyakan booking ${booking.id.slice(0, 8).toUpperCase()}`,
                  })}
                  onClick={(event) =>
                    handleWhatsAppNavigation(event, {
                      phone,
                      text: `Halo Bengkel Stroban, saya mau menanyakan booking ${booking.id.slice(0, 8).toUpperCase()}`,
                    })
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4" /> Hubungi Cabang
                </a>
              </Button>
              {canModify ? (
                <Button variant="outline" className="flex-1 gap-2" onClick={openReschedule}>
                  <CalendarClock className="h-4 w-4" /> Reschedule
                </Button>
              ) : (
                <Button asChild className="flex-1">
                  <Link to="/profile/history-perawatan">Lihat Riwayat</Link>
                </Button>
              )}
            </div>
            {canRequestCancel && (
              <Button
                variant="ghost"
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setCancelOpen(true)}
              >
                <X className="h-4 w-4" /> Ajukan Pembatalan
              </Button>
            )}
            {booking.cancel_requested && booking.status !== "cancelled" && (
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-center">
                <p className="font-semibold text-primary">Permintaan pembatalan menunggu persetujuan staff</p>
                {booking.cancel_reason && (
                  <p className="text-muted-foreground italic mt-1">"{booking.cancel_reason}"</p>
                )}
              </div>
            )}
          </div>

          {!isOwner && (
            <p className="text-xs text-muted-foreground text-center">
              Anda melihat status booking pengguna lain.
            </p>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
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
              placeholder="Contoh: Ada keperluan mendadak, ingin reschedule manual, dll."
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
              onClick={handleCancel}
              disabled={cancelling || !cancelReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Mengirim..." : "Ya, ajukan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              Pilih tanggal dan jam baru. Minimal 1 jam dari sekarang untuk hari ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-date">Tanggal baru</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                min={todayISO()}
                onChange={(e) => { setNewDate(e.target.value); setNewTime(""); }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Jam baru</Label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger>
                  <SelectValue placeholder={availableSlots.length ? "Pilih jam" : "Tidak ada jam tersedia"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isReschedToday && availableSlots.length === 0 && (
                <p className="text-xs text-muted-foreground">Tidak ada jadwal tersedia hari ini, pilih tanggal lain.</p>
              )}
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-xs space-y-1">
              <p className="text-muted-foreground">Jadwal sekarang:</p>
              <p className="font-medium">{formatDateID(booking.booking_date)} · {booking.booking_time}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)} disabled={rescheduling}>
              Batal
            </Button>
            <Button onClick={handleReschedule} disabled={rescheduling || !newDate || !newTime}>
              {rescheduling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingStatus;
