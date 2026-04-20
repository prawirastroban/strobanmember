import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Clock, CheckCircle2, ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  status: string;
  service_status: string;
  payment_status: string;
}

const formatDateID = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const BookingStatus = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, user_id, service_name, booking_date, booking_time, branch, status, service_status, payment_status")
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
      // Jump to progress once confirmed/in_progress/completed
      if (["confirmed", "in_progress", "completed"].includes(data.status)) {
        navigate(`/service/progress/${bookingId}`, { replace: true });
      }
    };
    load();

    const channel = supabase
      .channel(`booking-status-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload) => {
          const next = payload.new as BookingRow;
          setBooking(next);
          if (["confirmed", "in_progress", "completed"].includes(next.status)) {
            toast.success("Bengkel sudah konfirmasi! Mengarahkan ke progress servis...");
            setTimeout(() => navigate(`/service/progress/${bookingId}`, { replace: true }), 800);
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

  const isOwner = user?.id === booking.user_id;
  const meta = getBookingStatusMeta(booking.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl">
        <Link to="/profile/history-perawatan" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat
        </Link>

        <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-2xl animate-pulse" />
              <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
                <Clock className="h-12 w-12 text-yellow-500" />
              </div>
            </div>

            <div className="space-y-2">
              <Badge className={`${meta.badgeClass} gap-1 border`}>
                <CheckCircle2 className="h-3 w-3" /> {meta.label}
              </Badge>
              <h1 className="text-2xl font-bold">Menunggu Konfirmasi dari Bengkel</h1>
              <p className="text-muted-foreground max-w-md">{meta.description}</p>
              <p className="text-xs text-muted-foreground">Halaman akan otomatis berpindah saat bengkel mengonfirmasi.</p>
            </div>

            <div className="w-full rounded-2xl bg-muted/40 border border-border/50 p-5 space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Layanan</span>
                <span className="font-medium">{booking.service_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tanggal</span>
                <span className="font-medium">{formatDateID(booking.booking_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jam</span>
                <span className="font-medium">{booking.booking_time}</span>
              </div>
              {booking.branch && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cabang</span>
                  <span className="font-medium capitalize">{booking.branch}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Booking ID</span>
                <span className="font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button asChild variant="outline" className="flex-1 gap-2">
                <a href="https://wa.me/628973700800" target="_blank" rel="noopener noreferrer">
                  <Phone className="h-4 w-4" /> Hubungi Bengkel
                </a>
              </Button>
              <Button asChild className="flex-1">
                <Link to="/profile/history-perawatan">Lihat Riwayat</Link>
              </Button>
            </div>

            {!isOwner && (
              <p className="text-xs text-muted-foreground">Anda melihat status booking pengguna lain.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingStatus;
