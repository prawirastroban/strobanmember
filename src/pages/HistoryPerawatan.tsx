import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, FileText, Car, Wrench, ChevronRight, CreditCard, Clock,
  CheckCircle2, XCircle, AlertCircle, Receipt, Bell, Calendar,
  AlertTriangle, History as HistoryIcon, Plus, RotateCcw, X,
} from "lucide-react";
import { format, parseISO, startOfDay, differenceInCalendarDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { recommendNextService } from "@/lib/serviceRecommendation";
import { toast } from "sonner";

interface BookingItem {
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
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  tire_size: string | null;
  year: number | null;
  last_service_date: string | null;
}

const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  completed: { color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Selesai" },
  confirmed: { color: "bg-blue-500/15 text-blue-600 border-blue-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Dikonfirmasi" },
  in_progress: { color: "bg-primary/15 text-primary border-primary/20", icon: <Clock className="h-3 w-3" />, label: "Dikerjakan" },
  pending: { color: "bg-amber-500/15 text-amber-600 border-amber-500/20", icon: <Clock className="h-3 w-3" />, label: "Menunggu" },
  waiting_confirmation: { color: "bg-amber-500/15 text-amber-600 border-amber-500/20", icon: <Clock className="h-3 w-3" />, label: "Menunggu Konfirmasi" },
  cancelled: { color: "bg-muted text-muted-foreground border-border", icon: <XCircle className="h-3 w-3" />, label: "Dibatalkan" },
  failed: { color: "bg-destructive/15 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" />, label: "Gagal" },
  ready: { color: "bg-cyan-500/15 text-cyan-600 border-cyan-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Siap" },
  installed: { color: "bg-teal-500/15 text-teal-600 border-teal-500/20", icon: <CheckCircle2 className="h-3 w-3" />, label: "Terpasang" },
};

const paymentConfig: Record<string, { color: string; label: string }> = {
  paid: { color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", label: "Lunas" },
  success: { color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", label: "Lunas" },
  pending: { color: "bg-amber-500/15 text-amber-600 border-amber-500/20", label: "Pending" },
  unpaid: { color: "bg-muted text-muted-foreground border-border", label: "Belum Bayar" },
  failed: { color: "bg-destructive/15 text-destructive border-destructive/20", label: "Gagal" },
};

const getStatus = (s: string) => statusConfig[s] || statusConfig.pending;
const getPayment = (s: string) => paymentConfig[s] || paymentConfig.pending;

const HistoryPerawatan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; booking: BookingItem | null; payment: PaymentProof | null; vehicle: VehicleInfo | null; loading: boolean }>({
    open: false, booking: null, payment: null, vehicle: null, loading: false,
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [bRes, vRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id,service_name,service_type,service_price,booking_date,booking_time,status,payment_status,car_type,car_plate_number,created_at,branch")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false }),
      supabase
        .from("vehicles")
        .select("id,brand,model,license_plate,tire_size,year,last_service_date")
        .eq("user_id", user.id),
    ]);
    setBookings((bRes.data as BookingItem[]) || []);
    setVehicles((vRes.data as VehicleInfo[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData();
    const channel = supabase
      .channel("history-perawatan")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const todayStr = format(startOfDay(new Date()), "yyyy-MM-dd");

  const upcoming = useMemo(() =>
    bookings
      .filter(b => b.booking_date >= todayStr && !["completed", "cancelled"].includes(b.status))
      .sort((a, b) => (a.booking_date + a.booking_time).localeCompare(b.booking_date + b.booking_time)),
    [bookings, todayStr]
  );

  const history = useMemo(() =>
    bookings.filter(b => b.status === "completed"),
    [bookings]
  );

  const cancelled = useMemo(() =>
    bookings.filter(b => b.status === "cancelled").slice(0, 20),
    [bookings]
  );

  const reminders = useMemo(() => {
    return vehicles
      .filter(v => v.last_service_date)
      .map(v => {
        const rec = recommendNextService("servis berkala", v.last_service_date as string);
        const due = parseISO(rec.date);
        const daysLeft = differenceInCalendarDays(due, new Date());
        return { vehicle: v, daysLeft, dueDate: rec.date };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [vehicles]);

  const openPaymentProof = useCallback(async (booking: BookingItem) => {
    setPaymentModal({ open: true, booking, payment: null, vehicle: null, loading: true });
    const [payRes, vehRes] = await Promise.all([
      supabase.from("payments").select("id,payment_method,payment_status,amount,created_at,updated_at")
        .eq("booking_id", booking.id).order("created_at", { ascending: false }).limit(1),
      booking.car_plate_number
        ? supabase.from("vehicles").select("id,brand,model,license_plate,tire_size,year,last_service_date")
            .eq("license_plate", booking.car_plate_number).limit(1)
        : Promise.resolve({ data: null }),
    ]);
    setPaymentModal(prev => ({
      ...prev,
      payment: (payRes.data?.[0] as PaymentProof) || null,
      vehicle: (vehRes.data?.[0] as VehicleInfo) || null,
      loading: false,
    }));
  }, []);

  const handleCancel = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id).eq("user_id", user.id);
    if (error) toast.error("Gagal membatalkan", { description: error.message });
    else toast.success("Booking dibatalkan");
  };

  const methodLabel = (m: string) => ({ cash: "Tunai (Cash)", bank_transfer: "Transfer Bank", qris: "QRIS" } as Record<string, string>)[m] || m;

  // KPI counters
  const kpi = {
    upcoming: upcoming.length,
    reminders: reminders.filter(r => r.daysLeft <= 30).length,
    history: history.length,
    cancelled: cancelled.length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Servis & Pengingat</h1>
            <p className="text-sm text-muted-foreground">Riwayat perawatan, jadwal mendatang & reminder berkala</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <KpiCard icon={<Calendar className="h-4 w-4" />} label="Mendatang" value={kpi.upcoming} tone="text-blue-600 bg-blue-500/10" />
          <KpiCard icon={<Bell className="h-4 w-4" />} label="Reminder" value={kpi.reminders} tone="text-primary bg-primary/10" />
          <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Selesai" value={kpi.history} tone="text-emerald-600 bg-emerald-500/10" />
          <KpiCard icon={<XCircle className="h-4 w-4" />} label="Batal" value={kpi.cancelled} tone="text-muted-foreground bg-muted" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full rounded-xl mb-4 h-auto p-1">
              <TabsTrigger value="upcoming" className="text-xs gap-1 rounded-lg py-2">
                <Calendar className="h-3.5 w-3.5" />Mendatang
              </TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs gap-1 rounded-lg py-2">
                <Bell className="h-3.5 w-3.5" />Pengingat
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1 rounded-lg py-2">
                <HistoryIcon className="h-3.5 w-3.5" />Riwayat
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs gap-1 rounded-lg py-2">
                <XCircle className="h-3.5 w-3.5" />Batal
              </TabsTrigger>
            </TabsList>

            {/* UPCOMING */}
            <TabsContent value="upcoming" className="space-y-3 mt-0">
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-12 w-12" />}
                  title="Belum ada jadwal mendatang"
                  desc="Booking servis untuk melihat jadwal di sini"
                  cta={<Button onClick={() => navigate("/booking")}>Booking Sekarang</Button>}
                />
              ) : (
                upcoming.map(item => (
                  <BookingCard
                    key={item.id}
                    item={item}
                    onView={() => navigate(`/my-booking/${item.id}`)}
                    onPaymentProof={() => openPaymentProof(item)}
                    onInvoice={() => navigate(`/invoice/${item.id}`)}
                    onCancel={item.status === "pending" ? () => handleCancel(item.id) : undefined}
                  />
                ))
              )}
            </TabsContent>

            {/* REMINDERS */}
            <TabsContent value="reminders" className="space-y-3 mt-0">
              {reminders.length === 0 ? (
                <EmptyState
                  icon={<Bell className="h-12 w-12" />}
                  title="Belum ada reminder"
                  desc="Tambahkan kendaraan & catatan servis terakhir untuk pengingat berkala otomatis"
                  cta={<Button variant="outline" onClick={() => navigate("/my-vehicles")} className="gap-2"><Plus className="h-4 w-4" />Tambah Kendaraan</Button>}
                />
              ) : (
                reminders.map(({ vehicle, daysLeft, dueDate }) => {
                  const overdue = daysLeft < 0;
                  return (
                    <Card key={vehicle.id} className={`rounded-2xl border ${overdue ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-card/60"} backdrop-blur-xl`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${overdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                            {overdue ? <AlertTriangle className="h-5 w-5" /> : <Car className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{vehicle.brand} {vehicle.model}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.license_plate}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Servis terakhir: {vehicle.last_service_date ? format(parseISO(vehicle.last_service_date), "dd MMM yyyy", { locale: idLocale }) : "-"}
                            </p>
                            <p className="text-xs mt-1">
                              <span className="text-muted-foreground">Estimasi servis:</span>{" "}
                              <span className="font-medium">{format(parseISO(dueDate), "dd MMM yyyy", { locale: idLocale })}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pl-11">
                          <Badge variant="outline" className={overdue ? "bg-destructive/10 text-destructive border-destructive/30 text-[10px]" : "bg-primary/10 text-primary border-primary/20 text-[10px]"}>
                            {overdue ? `Terlambat ${Math.abs(daysLeft)} hari` : `${daysLeft} hari lagi`}
                          </Badge>
                          <Button size="sm" className="h-8 text-xs" onClick={() => navigate(`/booking?vehicleId=${vehicle.id}`)}>
                            Booking Sekarang
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* HISTORY */}
            <TabsContent value="history" className="space-y-3 mt-0">
              {history.length === 0 ? (
                <EmptyState
                  icon={<HistoryIcon className="h-12 w-12" />}
                  title="Belum ada riwayat servis"
                  desc="Servis yang selesai akan muncul di sini"
                  cta={<Button onClick={() => navigate("/booking")}>Booking Sekarang</Button>}
                />
              ) : (
                history.map(item => (
                  <BookingCard
                    key={item.id}
                    item={item}
                    onView={() => navigate(`/my-booking/${item.id}`)}
                    onPaymentProof={() => openPaymentProof(item)}
                    onInvoice={() => navigate(`/invoice/${item.id}`)}
                  />
                ))
              )}
            </TabsContent>

            {/* CANCELLED */}
            <TabsContent value="cancelled" className="space-y-3 mt-0">
              {cancelled.length === 0 ? (
                <EmptyState
                  icon={<XCircle className="h-12 w-12" />}
                  title="Tidak ada booking dibatalkan"
                  desc="Semua booking Anda berjalan lancar 👍"
                />
              ) : (
                cancelled.map(item => (
                  <BookingCard
                    key={item.id}
                    item={item}
                    onView={() => navigate(`/my-booking/${item.id}`)}
                    onPaymentProof={() => openPaymentProof(item)}
                    onInvoice={() => navigate(`/invoice/${item.id}`)}
                    extra={
                      <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1 hover:bg-primary/10" onClick={() => navigate("/booking")}>
                        <RotateCcw className="h-3.5 w-3.5" />Booking Lagi
                      </Button>
                    }
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Payment Proof Modal */}
      <Dialog open={paymentModal.open} onOpenChange={(o) => setPaymentModal(prev => ({ ...prev, open: o }))}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/50 rounded-2xl max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />Bukti Pembayaran
            </DialogTitle>
          </DialogHeader>
          {paymentModal.loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              {paymentModal.booking && (
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="font-semibold text-sm">{paymentModal.booking.service_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(paymentModal.booking.booking_date), "dd MMMM yyyy", { locale: idLocale })} • {paymentModal.booking.booking_time}
                  </p>
                </div>
              )}
              {paymentModal.vehicle && (
                <div className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-1"><Car className="h-4 w-4 text-primary" /><span className="font-medium text-sm">Kendaraan</span></div>
                  <p className="text-sm pl-6">{paymentModal.vehicle.brand} {paymentModal.vehicle.model} {paymentModal.vehicle.year ? `(${paymentModal.vehicle.year})` : ""}</p>
                  <p className="text-xs text-muted-foreground pl-6">{paymentModal.vehicle.license_plate}</p>
                  {paymentModal.vehicle.tire_size && <p className="text-xs text-muted-foreground pl-6">Ban: {paymentModal.vehicle.tire_size}</p>}
                </div>
              )}
              <Separator />
              {paymentModal.payment ? (
                <div className="space-y-3">
                  <DetailRow label="Transaction ID" value={paymentModal.payment.id.slice(0, 8).toUpperCase()} mono />
                  <DetailRow label="Metode Pembayaran" value={methodLabel(paymentModal.payment.payment_method)} />
                  <DetailRow label="Status" value={
                    <Badge variant="outline" className={`${getPayment(paymentModal.payment.payment_status).color} text-[11px] border`}>
                      {getPayment(paymentModal.payment.payment_status).label}
                    </Badge>
                  } />
                  <DetailRow label="Jumlah" value={<span className="font-bold text-primary">{formatIDR(Number(paymentModal.payment.amount))}</span>} />
                  <DetailRow label="Waktu Transaksi" value={format(new Date(paymentModal.payment.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale })} />
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada data pembayaran</p>
                </div>
              )}
              {paymentModal.booking && (
                <>
                  <Separator />
                  <Button className="w-full gap-2" onClick={() => { setPaymentModal(p => ({ ...p, open: false })); navigate(`/invoice/${paymentModal.booking!.id}`); }}>
                    <FileText className="h-4 w-4" />Lihat Invoice Lengkap
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

const KpiCard = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) => (
  <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl p-2.5 flex flex-col items-center justify-center text-center">
    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${tone} mb-1`}>{icon}</div>
    <p className="text-lg font-bold leading-none">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
  </div>
);

const EmptyState = ({ icon, title, desc, cta }: { icon: React.ReactNode; title: string; desc: string; cta?: React.ReactNode }) => (
  <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
    <CardContent className="py-12 text-center">
      <div className="text-muted-foreground/30 mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="text-base font-medium text-muted-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground/70 mb-5">{desc}</p>
      {cta}
    </CardContent>
  </Card>
);

const BookingCard = ({
  item, onView, onPaymentProof, onInvoice, onCancel, extra,
}: {
  item: BookingItem;
  onView: () => void;
  onPaymentProof: () => void;
  onInvoice: () => void;
  onCancel?: () => void;
  extra?: React.ReactNode;
}) => {
  const st = getStatus(item.status);
  const py = getPayment(item.payment_status);
  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl hover:shadow-lg hover:shadow-primary/5 transition-all">
      <CardContent className="p-4 sm:p-5">
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
            {format(new Date(item.booking_date), "dd MMM yyyy", { locale: idLocale })} • {item.booking_time}
          </span>
        </div>
        {item.car_type && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 pl-9">
            <Car className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{item.car_type}{item.car_plate_number ? ` • ${item.car_plate_number}` : ""}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3 pl-9">
          <Badge variant="outline" className={`${st.color} text-[10px] gap-1 border`}>{st.icon}{st.label}</Badge>
          <Badge variant="outline" className={`${py.color} text-[10px] border`}>{py.label}</Badge>
        </div>
        <div className="flex items-center justify-between pl-9 flex-wrap gap-2">
          <span className="text-sm font-bold text-primary">{formatIDR(Number(item.service_price))}</span>
          <div className="flex gap-1.5 flex-wrap">
            {extra}
            <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1 hover:bg-primary/10" onClick={onPaymentProof}>
              <Receipt className="h-3.5 w-3.5" />Bukti Bayar
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1 hover:bg-primary/10" onClick={onInvoice}>
              <FileText className="h-3.5 w-3.5" />Invoice
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1 hover:bg-primary/10" onClick={onView}>
              Detail<ChevronRight className="h-3 w-3" />
            </Button>
            {onCancel && (
              <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1 text-destructive hover:bg-destructive/10" onClick={onCancel}>
                <X className="h-3.5 w-3.5" />Batal
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DetailRow = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

export default HistoryPerawatan;
