import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock, Clock, Activity, CircleDollarSign, AlertCircle,
  UserPlus, Car, Users, Wifi, RefreshCw, ShoppingCart,
} from "lucide-react";
import { useSystemDashboardStats } from "@/hooks/useSystemDashboardStats";

const fmtRp = (n: number) =>
  "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n || 0));

interface KPIProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "amber" | "green" | "red" | "blue" | "violet";
}
const toneMap: Record<NonNullable<KPIProps["tone"]>, string> = {
  primary: "text-primary bg-primary/10",
  amber:   "text-amber-500 bg-amber-500/10",
  green:   "text-green-500 bg-green-500/10",
  red:     "text-red-500 bg-red-500/10",
  blue:    "text-blue-500 bg-blue-500/10",
  violet:  "text-violet-500 bg-violet-500/10",
};

const KPI = ({ icon: Icon, label, value, hint, tone = "primary" }: KPIProps) => (
  <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
    <CardContent className="p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
        <p className="text-xl font-bold mt-0.5 leading-tight truncate">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
      </div>
    </CardContent>
  </Card>
);

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="flex items-baseline justify-between mb-2">
    <h3 className="text-[13px] font-semibold uppercase tracking-wide text-foreground/90">{title}</h3>
    {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
  </div>
);

const SystemDashboardPanel = () => {
  const s = useSystemDashboardStats();
  const updated = s.lastUpdated
    ? s.lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  const sourceLabels: Record<string, { label: string; tone: string }> = {
    google:   { label: "Google",   tone: "bg-blue-500/15 text-blue-500" },
    email:    { label: "Email",    tone: "bg-violet-500/15 text-violet-500" },
    whatsapp: { label: "WhatsApp", tone: "bg-green-500/15 text-green-500" },
    referral: { label: "Referral", tone: "bg-amber-500/15 text-amber-500" },
    promo:    { label: "Promo",    tone: "bg-red-500/15 text-red-500" },
    direct:   { label: "Direct",   tone: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Dashboard Sistem</h2>
          <p className="text-xs text-muted-foreground">
            Update otomatis dari event database (booking, transaksi, customer, kendaraan, tire order).
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <RefreshCw className={`h-3 w-3 ${s.loading ? "animate-spin" : ""}`} />
          <span>Live · {updated}</span>
        </div>
      </div>

      <section>
        <SectionHeader title="Operasional Hari Ini" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={CalendarClock} tone="primary" label="Booking Baru" value={s.bookingsToday} hint="hari ini" />
          <KPI icon={Clock} tone="amber" label="Pending Konfirmasi" value={s.bookingsPending} hint="butuh aksi" />
          <KPI icon={Activity} tone="green" label="Booking Aktif" value={s.bookingsActive} hint="sedang berjalan" />
          <KPI icon={ShoppingCart} tone="violet" label="Tire Order" value={s.tireOrdersToday}
               hint={`${s.tireOrdersPending} pending bayar`} />
        </div>
      </section>

      <section>
        <SectionHeader title="Transaksi & Pembayaran" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPI icon={CircleDollarSign} tone="green" label="Pembayaran Masuk"
               value={fmtRp(s.paymentsTodayAmount)}
               hint={`${s.paymentsTodayCount} transaksi hari ini`} />
          <KPI icon={AlertCircle} tone="amber" label="Pending Pembayaran"
               value={fmtRp(s.paymentsPendingAmount)}
               hint={`${s.paymentsPendingCount} menunggu`} />
          <KPI icon={Activity} tone="blue" label="Total Customer Aktif"
               value={s.customersTotal} hint="terverifikasi" />
        </div>
      </section>

      <section>
        <SectionHeader title="Akuisisi Customer Hari Ini" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPI icon={UserPlus} tone="primary" label="Customer Baru" value={s.customersToday} hint="hari ini" />
          <KPI icon={Car} tone="violet" label="Kendaraan Baru" value={s.vehiclesToday} hint="terdaftar hari ini" />
          <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Source Registrasi</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.keys(s.customersTodayBySource).length === 0 ? (
                  <span className="text-xs text-muted-foreground">Belum ada hari ini</span>
                ) : (
                  Object.entries(s.customersTodayBySource).map(([src, n]) => {
                    const meta = sourceLabels[src] || sourceLabels.direct;
                    return (
                      <Badge key={src} variant="outline" className={`${meta.tone} border-0 font-medium`}>
                        {meta.label} · {n}
                      </Badge>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title="System Health" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPI icon={Wifi} tone="green" label="Sesi Online" value={s.sessionsOnline} hint="aktif 5 menit terakhir" />
          <KPI icon={Users} tone="blue" label="Total Customer" value={s.customersTotal} hint="terverifikasi" />
          <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
            <CardContent className="p-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted/30">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="leading-snug">
                Data di-refresh realtime dengan debounce 1.5 detik, dan polling fallback tiap 60 detik agar tetap stabil.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default SystemDashboardPanel;