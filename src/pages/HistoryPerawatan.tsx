import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, ClipboardCheck, FileText, Car, Wrench, ChevronRight,
  CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, Receipt
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface HistoryItem {
  id: string;
  service_name: string;
  service_type: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_status: string;
  car_type: string | null;
  car_plate_number: string | null;
  created_at: string;
  branch: string | null;
}

interface PaymentProof {
  id: string;
  payment_method: string;
  payment_status: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

interface VehicleInfo {
  brand: string;
  model: string;
  license_plate: string;
  tire_size: string | null;
  year: number | null;
}

const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  completed: { color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Selesai" },
  confirmed: { color: "bg-blue-500/15 text-blue-500 border-blue-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Dikonfirmasi" },
  in_progress: { color: "bg-amber-500/15 text-amber-500 border-amber-500/20", icon: <Clock className="h-3 w-3" />, label: "Dikerjakan" },
  pending: { color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20", icon: <Clock className="h-3 w-3" />, label: "Menunggu" },
  cancelled: { color: "bg-muted text-muted-foreground border-border", icon: <XCircle className="h-3 w-3" />, label: "Dibatalkan" },
  failed: { color: "bg-red-500/15 text-red-500 border-red-500/20", icon: <XCircle className="h-3 w-3" />, label: "Gagal" },
  ready: { color: "bg-cyan-500/15 text-cyan-500 border-cyan-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Siap" },
  installed: { color: "bg-teal-500/15 text-teal-500 border-teal-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Terpasang" },
};

const paymentConfig: Record<string, { color: string; label: string }> = {
  paid: { color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20", label: "Lunas" },
  success: { color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20", label: "Lunas" },
  pending: { color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20", label: "Pending" },
  unpaid: { color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20", label: "Belum Bayar" },
  failed: { color: "bg-red-500/15 text-red-500 border-red-500/20", label: "Gagal" },
};

const getStatus = (s: string) => statusConfig[s] || statusConfig.pending;
const getPayment = (s: string) => paymentConfig[s] || paymentConfig.pending;

const HistoryPerawatan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; booking: HistoryItem | null; payment: PaymentProof | null; vehicle: VehicleInfo | null; loading: boolean }>({
    open: false, booking: null, payment: null, vehicle: null, loading: false,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id,service_name,service_type,service_price,booking_date,booking_time,status,payment_status,car_type,car_plate_number,created_at,branch")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as HistoryItem[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const openPaymentProof = useCallback(async (booking: HistoryItem) => {
    setPaymentModal({ open: true, booking, payment: null, vehicle: null, loading: true });

    const [payRes, vehRes] = await Promise.all([
      supabase
        .from("payments")
        .select("id,payment_method,payment_status,amount,created_at,updated_at")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: false })
        .limit(1),
      booking.car_plate_number
        ? supabase
            .from("vehicles")
            .select("brand,model,license_plate,tire_size,year")
            .eq("license_plate", booking.car_plate_number)
            .limit(1)
        : Promise.resolve({ data: null }),
    ]);

    setPaymentModal(prev => ({
      ...prev,
      payment: (payRes.data?.[0] as PaymentProof) || null,
      vehicle: (vehRes.data?.[0] as VehicleInfo) || null,
      loading: false,
    }));
  }, []);

  const methodLabel = (m: string) => {
    switch (m) {
      case "cash": return "Tunai (Cash)";
      case "bank_transfer": return "Transfer Bank";
      case "qris": return "QRIS";
      default: return m;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <ClipboardCheck className="h-6 w-6 text-primary" />
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
        ) : items.length === 0 ? (
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="h-14 w-14 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-1">Belum ada riwayat perawatan</p>
              <p className="text-sm text-muted-foreground/70 mb-5">Mulai booking servis untuk melihat riwayat di sini</p>
              <Button onClick={() => navigate("/booking")}>Booking Sekarang</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const st = getStatus(item.status);
              const py = getPayment(item.payment_status);
              return (
                <Card
                  key={item.id}
                  className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.005] group"
                >
                  <CardContent className="p-4 sm:p-5">
                    {/* Top row: service + date */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                          <Wrench className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{item.service_name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{item.service_type}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.booking_date), "dd MMM yyyy", { locale: idLocale })}
                      </span>
                    </div>

                    {/* Vehicle info */}
                    {item.car_type && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 pl-9">
                        <Car className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{item.car_type}{item.car_plate_number ? ` • ${item.car_plate_number}` : ""}</span>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3 pl-9">
                      <Badge variant="outline" className={`${st.color} text-[10px] gap-1 border`}>
                        {st.icon} {st.label}
                      </Badge>
                      <Badge variant="outline" className={`${py.color} text-[10px] border`}>
                        {py.label}
                      </Badge>
                    </div>

                    {/* Bottom row: price + actions */}
                    <div className="flex items-center justify-between pl-9">
                      <span className="text-sm font-bold text-primary">{formatIDR(Number(item.service_price))}</span>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-[11px] gap-1 hover:bg-primary/10"
                          onClick={() => openPaymentProof(item)}
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Bukti Bayar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-[11px] gap-1 hover:bg-primary/10"
                          onClick={() => navigate(`/invoice/${item.id}`)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Invoice
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Payment Proof Modal */}
      <Dialog open={paymentModal.open} onOpenChange={(o) => setPaymentModal(prev => ({ ...prev, open: o }))}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/50 rounded-2xl max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Bukti Pembayaran
            </DialogTitle>
          </DialogHeader>

          {paymentModal.loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Service Info */}
              {paymentModal.booking && (
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="font-semibold text-sm">{paymentModal.booking.service_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(paymentModal.booking.booking_date), "dd MMMM yyyy", { locale: idLocale })} • {paymentModal.booking.booking_time}
                  </p>
                </div>
              )}

              {/* Vehicle Info */}
              {paymentModal.vehicle && (
                <div className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Kendaraan</span>
                  </div>
                  <p className="text-sm pl-6">{paymentModal.vehicle.brand} {paymentModal.vehicle.model} {paymentModal.vehicle.year ? `(${paymentModal.vehicle.year})` : ""}</p>
                  <p className="text-xs text-muted-foreground pl-6">{paymentModal.vehicle.license_plate}</p>
                  {paymentModal.vehicle.tire_size && (
                    <p className="text-xs text-muted-foreground pl-6">Ban: {paymentModal.vehicle.tire_size}</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Payment Details */}
              {paymentModal.payment ? (
                <div className="space-y-3">
                  <DetailRow label="Transaction ID" value={paymentModal.payment.id.slice(0, 8).toUpperCase()} mono />
                  <DetailRow label="Metode Pembayaran" value={methodLabel(paymentModal.payment.payment_method)} />
                  <DetailRow label="Status" value={
                    <Badge variant="outline" className={`${getPayment(paymentModal.payment.payment_status).color} text-[11px] border`}>
                      {getPayment(paymentModal.payment.payment_status).label}
                    </Badge>
                  } />
                  <DetailRow label="Jumlah" value={
                    <span className="font-bold text-primary">{formatIDR(Number(paymentModal.payment.amount))}</span>
                  } />
                  <DetailRow label="Waktu Transaksi" value={
                    format(new Date(paymentModal.payment.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale })
                  } />
                  {paymentModal.payment.updated_at !== paymentModal.payment.created_at && (
                    <DetailRow label="Terakhir Update" value={
                      format(new Date(paymentModal.payment.updated_at), "dd MMM yyyy, HH:mm", { locale: idLocale })
                    } />
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada data pembayaran</p>
                </div>
              )}

              {/* Invoice Button */}
              {paymentModal.booking && (
                <>
                  <Separator />
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setPaymentModal(prev => ({ ...prev, open: false }));
                      navigate(`/invoice/${paymentModal.booking!.id}`);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Lihat Invoice Lengkap
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

export default HistoryPerawatan;
