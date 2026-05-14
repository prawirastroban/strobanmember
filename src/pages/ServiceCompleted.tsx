import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, CheckCircle2, Car, Wrench, Calendar, Star, Sparkles, FileText, RefreshCw, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { recommendNextService } from "@/lib/serviceRecommendation";
import Navbar from "@/components/Navbar";
import { buildWhatsAppUrl, handleWhatsAppNavigation } from "@/lib/whatsapp";

interface BookingRow {
  id: string;
  user_id: string;
  service_name: string;
  service_type: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  branch: string | null;
  car_type: string | null;
  car_plate_number: string | null;
  status: string;
  next_service_date: string | null;
  vehicle_id: string | null;
}

const formatDateID = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

const ServiceCompleted = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, user_id, service_name, service_type, service_price, booking_date, booking_time, branch, car_type, car_plate_number, status, next_service_date, vehicle_id"
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error("Booking tidak ditemukan");
        navigate("/profile/history-perawatan");
        return;
      }
      if (data.status !== "completed") {
        // Bounce to status / progress page
        navigate(`/booking/status/${bookingId}`, { replace: true });
        return;
      }
      setBooking(data as BookingRow);
      setLoading(false);

      // Save next_service_date if missing
      if (!data.next_service_date) {
        const rec = recommendNextService(data.service_name, data.booking_date);
        const { error: updErr } = await supabase
          .from("bookings")
          .update({ next_service_date: rec.date })
          .eq("id", data.id);
        if (!updErr && active) {
          setBooking((prev) => (prev ? { ...prev, next_service_date: rec.date } : prev));
        }
      }
    })();
    return () => { active = false; };
  }, [bookingId, navigate]);

  const submitReview = async () => {
    if (!booking || rating === 0) {
      toast.error("Pilih rating terlebih dahulu");
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("activity_logs").insert({
      type: "review",
      description: `Customer review for ${booking.service_name}: ${rating} star`,
      user_id: booking.user_id,
      metadata: {
        booking_id: booking.id,
        rating,
        review: reviewText.trim() || null,
        service_name: booking.service_name,
        branch: booking.branch,
        submitted_at: new Date().toISOString(),
      },
    });
    setSubmittingReview(false);
    if (error) {
      toast.error("Gagal mengirim ulasan: " + error.message);
      return;
    }
    setReviewSent(true);
    setReviewOpen(false);
    toast.success("Terima kasih atas ulasan Anda! ⭐");
  };

  if (loading || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <Navbar />
        <div className="container mx-auto px-4 pt-3 md:pt-4 pb-20 max-w-2xl">
          <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  const rec = recommendNextService(booking.service_name, booking.booking_date);
  const nextDate = booking.next_service_date ?? rec.date;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 pt-3 md:pt-4 pb-20 max-w-2xl">
        {/* Hero celebration */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/60 to-card/60 backdrop-blur-xl p-8 shadow-2xl text-center space-y-4 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />

          <div className="relative inline-flex">
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
          </div>

          <div className="relative space-y-2">
            <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40 gap-1">
              <Sparkles className="h-3 w-3" /> Servis Selesai
            </Badge>
            <h1 className="text-3xl font-bold">Servis selesai 🎉</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Terima kasih telah mempercayakan kendaraan Anda kepada Bengkel Stroban.
            </p>
          </div>
        </div>

        {/* Detail */}
        <div className="mt-6 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Ringkasan Servis
          </h2>
          <div className="rounded-2xl bg-muted/40 border border-border/50 p-5 space-y-3 text-sm">
            <Row icon={<Car className="h-4 w-4" />} label="Kendaraan">
              <div className="text-right">
                <p className="font-medium">{booking.car_type || "—"}</p>
                {booking.car_plate_number && (
                  <p className="font-mono uppercase text-xs text-muted-foreground">
                    {booking.car_plate_number}
                  </p>
                )}
              </div>
            </Row>
            <Row icon={<Wrench className="h-4 w-4" />} label="Layanan">
              <span className="font-medium text-right">{booking.service_name}</span>
            </Row>
            <Row icon={<Calendar className="h-4 w-4" />} label="Tanggal Servis">
              <span className="font-medium">
                {formatDateID(booking.booking_date)} · {booking.booking_time}
              </span>
            </Row>
            {booking.branch && (
              <Row icon={<span className="inline-block h-2 w-2 rounded-full bg-primary" />} label="Cabang">
                <span className="font-medium capitalize">{booking.branch}</span>
              </Row>
            )}
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-6 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/60 backdrop-blur-xl p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Rekomendasi Servis Berikutnya</h3>
              <p className="text-sm text-muted-foreground">
                Berdasarkan kendaraan Anda, disarankan {rec.label} dalam{" "}
                <span className="font-semibold text-foreground">{rec.monthsApprox} bulan</span>.
              </p>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Pengingat: {formatDateID(nextDate)}
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={() => setReviewOpen(true)}
            disabled={reviewSent}
          >
            <Star className={`h-4 w-4 ${reviewSent ? "fill-primary text-primary" : ""}`} />
            {reviewSent ? "Ulasan Terkirim" : "Beri Ulasan"}
          </Button>
          <Button asChild size="lg" className="gap-2">
            <Link to="/booking">
              <RefreshCw className="h-4 w-4" /> Booking Lagi
            </Link>
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button asChild variant="ghost" className="gap-2">
            <Link to={`/invoice/${booking.id}`}>
              <FileText className="h-4 w-4" /> Lihat Invoice
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <a
              href={buildWhatsAppUrl({
                phone: "628973700800",
                text: `Halo Bengkel Stroban, saya mau menanyakan servis ${booking.id.slice(0, 8).toUpperCase()}`,
              })}
              onClick={(event) =>
                handleWhatsAppNavigation(event, {
                  phone: "628973700800",
                  text: `Halo Bengkel Stroban, saya mau menanyakan servis ${booking.id.slice(0, 8).toUpperCase()}`,
                })
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Phone className="h-4 w-4" /> Hubungi Cabang
            </a>
          </Button>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Beri Ulasan
            </DialogTitle>
            <DialogDescription>
              Bagaimana pengalaman Anda dengan servis kami?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hoverRating || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${n} star`}
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        filled ? "fill-primary text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <Textarea
              placeholder="Ceritakan pengalaman Anda (opsional)..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{reviewText.length}/500</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={submittingReview}>
              Batal
            </Button>
            <Button onClick={submitReview} disabled={submittingReview || rating === 0}>
              {submittingReview && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Kirim Ulasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-3">
    <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
    <div className="flex-1 flex justify-between gap-2 items-start">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  </div>
);

export default ServiceCompleted;
