import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Loader2, Clock, CheckCircle2, Car, Wrench, Sparkles, Bell,
  MessageCircle, RefreshCw, ShieldAlert,
} from "lucide-react";

interface PublicBooking {
  id: string;
  status: string;
  service_status: string | null;
  payment_status: string | null;
  service_name: string | null;
  service_type: string | null;
  booking_date: string | null;
  booking_time: string | null;
  branch: string | null;
  car_plate_masked: string | null;
  customer_first_name: string | null;
  pickup_status: string | null;
  service_location: string | null;
  queue_estimated_start: string | null;
  created_at: string;
  updated_at: string;
}

const STEPS = [
  { key: "pending", label: "Pesanan Diterima", icon: Clock },
  { key: "confirmed", label: "Dikonfirmasi", icon: Bell },
  { key: "checked_in", label: "Tiba di Bengkel", icon: Car },
  { key: "in_progress", label: "Pengerjaan", icon: Wrench },
  { key: "finishing", label: "Finishing", icon: Sparkles },
  { key: "completed", label: "Selesai", icon: CheckCircle2 },
];

const statusIndex = (s: string) => {
  const i = STEPS.findIndex((x) => x.key === s);
  return i === -1 ? 0 : i;
};

const SUPPORT_WA = "628973700800";

const PublicBookingTracker = () => {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc("get_public_booking_by_token", {
        _token: token,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setError("Link tracking tidak ditemukan atau sudah tidak berlaku.");
        setBooking(null);
      } else {
        setBooking(row as PublicBooking);
        setError(null);
      }
    } catch (e) {
      setError("Tidak dapat memuat data booking. Coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBooking();
    // Set document title + noindex
    document.title = "Status Booking — Sahabat Stroban Service";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [fetchBooking]);

  // Auto-poll every 20s while page is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchBooking();
    }, 20_000);
    return () => clearInterval(id);
  }, [fetchBooking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Link Tidak Valid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild className="w-full">
              <a href={`https://wa.me/${SUPPORT_WA}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Hubungi Support
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Ke Beranda</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentIdx = statusIndex(booking.status);
  const progress = ((currentIdx + 1) / STEPS.length) * 100;
  const bookingDateStr = booking.booking_date
    ? new Date(booking.booking_date + "T00:00:00").toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  const isCompleted = booking.status === "completed";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="max-w-2xl mx-auto pt-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Lacak Servis Anda</h1>
          <p className="text-sm text-muted-foreground">
            Halo {booking.customer_first_name || "Pelanggan"}, berikut status terkini servis Anda.
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate">{booking.service_name || "Servis"}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {bookingDateStr} • {booking.booking_time || "-"} • {booking.branch || "-"}
                </p>
              </div>
              <Badge variant={isCompleted ? "default" : "secondary"}>
                {STEPS[currentIdx]?.label || booking.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {Math.round(progress)}% selesai
              </p>
            </div>

            <div className="space-y-2">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const reached = i <= currentIdx;
                const active = i === currentIdx && !isCompleted;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 p-2 rounded-lg transition ${
                      active ? "bg-primary/10" : ""
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${reached ? "font-medium" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                    {active && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        Sekarang
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Kendaraan</p>
                <p className="text-sm font-medium">{booking.car_plate_masked || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pembayaran</p>
                <p className="text-sm font-medium capitalize">
                  {booking.payment_status?.replace(/_/g, " ") || "-"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBooking}
                disabled={refreshing}
                className="flex-1"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button asChild size="sm" className="flex-1">
                <a
                  href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(
                    `Halo, saya ingin tanya status booking ${booking.id.slice(0, 8)}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Tanya Admin
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          Halaman ini diperbarui otomatis setiap 20 detik.
          <br />
          <Link to="/auth" className="underline">
            Login
          </Link>{" "}
          untuk akses penuh ke riwayat & loyalty Anda.
        </div>
      </div>
    </div>
  );
};

export default PublicBookingTracker;