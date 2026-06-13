import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, History, FileText, Car, Wrench, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BookingWithInvoice {
  id: string;
  service_name: string;
  service_type: string;
  service_price: number;
  booking_date: string;
  status: string;
  payment_status: string;
  car_type: string | null;
  car_plate_number: string | null;
  created_at: string;
}

const formatIDR = (n: number) => (!n || n <= 0) ? "FREE" : `Rp ${n.toLocaleString("id-ID")}`;

const statusColor = (s: string) => {
  switch (s) {
    case "completed": return "bg-emerald-500/20 text-emerald-400";
    case "confirmed": return "bg-blue-500/20 text-blue-400";
    case "pending": return "bg-primary/20 text-primary";
    case "failed": return "bg-red-500/20 text-red-400";
    case "cancelled": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const paymentColor = (s: string) => {
  switch (s) {
    case "paid": case "success": return "bg-emerald-500/20 text-emerald-400";
    case "pending": case "unpaid": return "bg-primary/20 text-primary";
    case "failed": return "bg-red-500/20 text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const ServiceHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id,service_name,service_type,service_price,booking_date,status,payment_status,car_type,car_plate_number,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setBookings((data as BookingWithInvoice[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">History Perawatan</h1>
            <p className="text-sm text-muted-foreground">Riwayat servis & transaksi kendaraan Anda</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
            <CardContent className="py-16 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Belum ada riwayat perawatan</p>
              <Button className="mt-4" onClick={() => navigate("/booking")}>Booking Sekarang</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.id} className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-semibold text-sm truncate">{b.service_name}</span>
                      </div>
                      {b.car_type && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Car className="h-3 w-3" />
                          <span>{b.car_type} {b.car_plate_number && `• ${b.car_plate_number}`}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="secondary" className={`${statusColor(b.status)} text-[10px]`}>
                          {b.status}
                        </Badge>
                        <Badge variant="secondary" className={`${paymentColor(b.payment_status)} text-[10px]`}>
                          {b.payment_status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(b.booking_date), "dd MMM yyyy")}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {formatIDR(Number(b.service_price))}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0 gap-1 text-xs"
                      onClick={() => navigate(`/invoice/${b.id}`)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Invoice
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ServiceHistoryPage;
