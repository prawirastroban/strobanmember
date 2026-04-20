import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wrench, CheckCircle2, ArrowLeft, Sparkles, Car, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface BookingRow {
  id: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  branch: string | null;
  status: string;
  service_status: string;
}

const STAGES = [
  { key: "confirmed", label: "Dikonfirmasi", icon: Car },
  { key: "in_progress", label: "Pengerjaan", icon: Wrench },
  { key: "completed", label: "Selesai", icon: CheckCircle2 },
];

const stageIndex = (status: string) => {
  if (status === "completed") return 2;
  if (["in_progress", "finishing", "checked_in"].includes(status)) return 1;
  if (status === "confirmed") return 0;
  return 0;
};

const ServiceProgress = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, service_name, booking_date, booking_time, branch, status, service_status")
        .eq("id", bookingId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error("Booking tidak ditemukan");
        navigate("/profile/history-perawatan");
        return;
      }
      // Bounce back if not yet confirmed
      if (["pending", "waiting_confirmation"].includes(data.status)) {
        navigate(`/booking/status/${bookingId}`, { replace: true });
        return;
      }
      // Forward to completed page if already done
      if (data.status === "completed") {
        navigate(`/service/completed/${bookingId}`, { replace: true });
        return;
      }
      setBooking(data as BookingRow);
      setLoading(false);
    };
    load();

    // If already completed at load time, redirect immediately
    const channel = supabase
      .channel(`service-progress-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload) => {
          const next = payload.new as BookingRow;
          setBooking(next);
          if (next.status === "completed") {
            toast.success("Servis Anda sudah selesai! 🎉 Mengarahkan...");
            setTimeout(() => navigate(`/service/completed/${bookingId}`, { replace: true }), 800);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId, navigate]);

  if (loading || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentIdx = stageIndex(booking.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl">
        <Link to="/profile/history-perawatan" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat
        </Link>

        <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-2xl">
          <div className="text-center space-y-3 mb-8">
            <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
              <Wrench className="h-3 w-3" /> Servis Berjalan
            </Badge>
            <h1 className="text-2xl font-bold">{booking.service_name}</h1>
            <p className="text-sm text-muted-foreground">
              {booking.booking_date} · {booking.booking_time} {booking.branch && `· ${booking.branch}`}
            </p>
          </div>

          {/* Progress Stages */}
          <div className="space-y-4">
            {STAGES.map((stage, idx) => {
              const isDone = idx < currentIdx || booking.status === "completed";
              const isActive = idx === currentIdx && booking.status !== "completed";
              const Icon = stage.icon;
              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-4 rounded-2xl p-4 border transition-all ${
                    isActive
                      ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                      : isDone
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground animate-pulse"
                        : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{stage.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {isDone ? "Selesai" : isActive ? "Sedang berlangsung..." : "Menunggu"}
                    </p>
                  </div>
                  {isActive && <Clock className="h-5 w-5 text-primary animate-spin" />}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="flex-1">
              <a href="https://wa.me/628973700800" target="_blank" rel="noopener noreferrer">
                Hubungi Bengkel
              </a>
            </Button>
            <Button asChild className="flex-1">
              <Link to="/profile/history-perawatan">Lihat Riwayat</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProgress;
