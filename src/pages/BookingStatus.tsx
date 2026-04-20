import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, Clock, CheckCircle2, ArrowLeft, Phone, Car, Wrench, MapPin, Hourglass, X, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { getBookingStatusMeta } from "@/lib/bookingStatus";

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
  { key: "confirmed", label: "Dikonfirmasi", icon: CheckCircle2 },
  { key: "in_progress", label: "Pengerjaan", icon: Wrench },
  { key: "completed", label: "Selesai", icon: CheckCircle2 },
] as const;

const formatDateID = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const getStepIndex = (status: string) => {
  const i = PROGRESS_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
};

const BookingStatus = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const navigatedRef = useRef(false);

  // --- Load + realtime + polling fallback ---
  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    const handleUpdate = (next: BookingRow) => {
      setBooking(next);
      if (
        !navigatedRef.current &&
        ["confirmed", "in_progress", "completed"].includes(next.status)
      ) {
        navigatedRef.current = true;
        toast.success("Bengkel sudah konfirmasi! Mengarahkan ke progress servis...");
        setTimeout(() => navigate(`/service/progress/${bookingId}`, { replace: true }), 800);
      }
    };

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, user_id, service_name, booking_date, booking_time, branch, car_type, car_plate_number, status, service_status, payment_status, created_at"
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

    // Polling fallback every 3s as safety net
    const poll = setInterval(fetchOnce, 3000);

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [bookingId, navigate]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);
    setCancelling(false);
    setCancelOpen(false);
    if (error) {
      toast.error("Gagal membatalkan: " + error.message);
      return;
    }
    toast.success("Booking dibatalkan");
    navigate("/profile/history-perawatan", { replace: true });
  };

  if (loading || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl">
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
  const canCancel = ["pending", "waiting_confirmation"].includes(booking.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/profile/history-perawatan"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat
          </Link>
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

          {/* Progress bar with steps */}
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="flex-1 gap-2">
              <a
                href={`https://wa.me/${phone}?text=Halo%20Bengkel%20Stroban%2C%20saya%20mau%20menanyakan%20booking%20${booking.id
                  .slice(0, 8)
                  .toUpperCase()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="h-4 w-4" /> Hubungi Cabang
              </a>
            </Button>
            {canCancel ? (
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => setCancelOpen(true)}
              >
                <X className="h-4 w-4" /> Batalkan Booking
              </Button>
            ) : (
              <Button asChild className="flex-1">
                <Link to="/profile/history-perawatan">Lihat Riwayat</Link>
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

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking ini akan dibatalkan. Jika sudah membayar, dana akan diproses untuk
              pengembalian (hubungi cabang untuk detail). Tindakan ini tidak bisa diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Tidak</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Membatalkan..." : "Ya, batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingStatus;
