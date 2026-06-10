import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarCheck, Users, Car, TrendingUp, TrendingDown,
  Clock, CheckCircle2, XCircle, Loader2,
  Plus, CircleDot, Activity, Wrench, Disc3,
  AlertTriangle, Package, Megaphone, ShieldAlert, Gift,
  UserPlus, Truck, UserCheck, CreditCard, DollarSign
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { format, subDays, formatDistanceToNow } from "date-fns";
import StaffQuickBookingDialog from "./StaffQuickBookingDialog";
import { QuickAccessGrid, NeedAttention } from "./DashboardHomeBlocks";

// ── Types ──────────────────────────────────────────────────────────────────
interface BookingRow {
  id: string; status: string; service_price: number; service_name: string;
  customer_name: string; booking_date: string; created_at: string;
}
interface VehicleRow {
  id: string; brand: string; tire_size: string | null; created_at: string; user_id: string;
}
interface RevenuePoint { date: string; revenue: number; }
interface ActivityLog {
  id: string; type: string; description: string; user_id: string | null; created_at: string;
}

// ── Glass card wrapper ─────────────────────────────────────────────────────
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-card/60 backdrop-blur-xl border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-all duration-300 rounded-2xl ${className}`}>
    {children}
  </Card>
);

// ── KPI Card ───────────────────────────────────────────────────────────────
const KPICard = ({
  icon: Icon, label, value, trend, trendLabel, accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>; label: string;
  value: string | number; trend?: number; trendLabel?: string; accent?: boolean;
}) => {
  const isUp = (trend ?? 0) >= 0;
  return (
    <GlassCard className={accent ? "ring-1 ring-primary/30" : ""}>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-3 text-xs">
            {isUp ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
            <span className={isUp ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
              {isUp ? "+" : ""}{trend}
            </span>
            <span className="text-muted-foreground">{trendLabel || "vs yesterday"}</span>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
};

// ── Status config ──────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; bar: string }> = {
  pending:     { label: "Pending",     color: "bg-amber-500/20 text-amber-400",     bar: "bg-amber-500" },
  confirmed:   { label: "Confirmed",   color: "bg-blue-500/20 text-blue-400",       bar: "bg-blue-500" },
  in_progress: { label: "In Progress", color: "bg-orange-500/20 text-orange-400",   bar: "bg-orange-500" },
  completed:   { label: "Completed",   color: "bg-emerald-500/20 text-emerald-400", bar: "bg-emerald-500" },
  cancelled:   { label: "Cancelled",   color: "bg-red-500/20 text-red-400",         bar: "bg-red-500" },
};

// ── Activity icon map ──────────────────────────────────────────────────────
const activityIconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  booking: { icon: CalendarCheck, color: "text-blue-400" },
  inventory: { icon: Package, color: "text-orange-400" },
  marketing: { icon: Megaphone, color: "text-purple-400" },
  vehicle: { icon: Car, color: "text-cyan-400" },
  customer: { icon: UserPlus, color: "text-emerald-400" },
  payment: { icon: CreditCard, color: "text-green-400" },
};

// ── Main Component ─────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isStaff } = useUserRole();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [newCustomers7d, setNewCustomers7d] = useState(0);
  const [tireCount, setTireCount] = useState(0);
  const [activePromos, setActivePromos] = useState(0);
  const [inactivePromos, setInactivePromos] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [unverifiedCount, setUnverifiedCount] = useState(0);
  const [paymentStats, setPaymentStats] = useState({ revenue: 0, pending: 0, failed: 0 });

  useEffect(() => {
    const load = async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [bk, vh, pr, pr7, tires, promosActive, promosInactive, logs, unverified, paymentsRes] = await Promise.all([
        supabase.from("bookings").select("id,status,service_price,service_name,customer_name,booking_date,created_at")
          .gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }),
        supabase.from("vehicles").select("id,brand,tire_size,created_at,user_id").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("tires").select("id", { count: "exact", head: true }),
        supabase.from("rewards").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("rewards").select("id", { count: "exact", head: true }).eq("is_active", false),
        supabase.from("activity_logs").select("id,type,description,user_id,created_at")
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", false),
        supabase.from("payments").select("amount,payment_status").gte("created_at", thirtyDaysAgo),
      ]);

      setBookings((bk.data as BookingRow[]) || []);
      setVehicles((vh.data as VehicleRow[]) || []);
      setCustomerCount(pr.count || 0);
      setNewCustomers7d(pr7.count || 0);
      setTireCount(tires.count || 0);
      setActivePromos(promosActive.count || 0);
      setInactivePromos(promosInactive.count || 0);
      setActivityLogs((logs.data as ActivityLog[]) || []);
      setUnverifiedCount(unverified.count || 0);

      // Payment stats
      const paymentData = (paymentsRes.data || []) as { amount: number; payment_status: string }[];
      const revenue = paymentData.filter(p => p.payment_status === "success").reduce((s, p) => s + Number(p.amount), 0);
      const pending = paymentData.filter(p => p.payment_status === "pending").length;
      const failed = paymentData.filter(p => p.payment_status === "failed").length;
      setPaymentStats({ revenue, pending, failed });

      setLoading(false);
    };
    load();

    // Realtime: keep dashboard KPI cards in sync with bookings/payments/activity
    const channel = supabase
      .channel("admin-dashboard-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── KPI calculations ──────────────────────────────────────────────────
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const weekStart = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const todayBookings = bookings.filter((b) => b.booking_date === todayStr);
  const yesterdayBookings = bookings.filter((b) => b.booking_date === yesterdayStr);
  const weekBookings = bookings.filter((b) => b.booking_date >= weekStart);

  const todayRevenue = todayBookings.filter((b) => b.status === "completed").reduce((s, b) => s + Number(b.service_price), 0);
  const yesterdayRevenue = yesterdayBookings.filter((b) => b.status === "completed").reduce((s, b) => s + Number(b.service_price), 0);
  const completedToday = todayBookings.filter((b) => b.status === "completed").length;
  const pendingAll = bookings.filter((b) => b.status === "pending").length;

  // ── Status counts ─────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return counts;
  }, [bookings]);
  const totalStatusCount = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;

  // ── Revenue chart (7 days) ────────────────────────────────────────────
  const chartData = useMemo<RevenuePoint[]>(() => {
    const days: RevenuePoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const rev = bookings.filter((b) => b.booking_date === d && b.status === "completed")
        .reduce((s, b) => s + Number(b.service_price), 0);
      days.push({ date: format(subDays(new Date(), i), "dd MMM"), revenue: rev });
    }
    return days;
  }, [bookings]);

  // ── Top services ──────────────────────────────────────────────────────
  const topServices = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach((b) => { map[b.service_name] = (map[b.service_name] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [bookings]);
  const maxServiceCount = topServices[0]?.count || 1;

  // ── Vehicle insights ──────────────────────────────────────────────────
  const vehicleInsights = useMemo(() => {
    const brandMap: Record<string, number> = {};
    const tireMap: Record<string, number> = {};
    vehicles.forEach((v) => {
      brandMap[v.brand] = (brandMap[v.brand] || 0) + 1;
      if (v.tire_size) tireMap[v.tire_size] = (tireMap[v.tire_size] || 0) + 1;
    });
    const topBrand = Object.entries(brandMap).sort((a, b) => b[1] - a[1])[0];
    const topTire = Object.entries(tireMap).sort((a, b) => b[1] - a[1])[0];
    return { total: vehicles.length, topBrand: topBrand?.[0] || "—", topTire: topTire?.[0] || "—" };
  }, [vehicles]);

  // ── Recently added vehicles (7d) ─────────────────────────────────────
  const recentVehicles = useMemo(() => {
    const sevenAgo = subDays(new Date(), 7).toISOString();
    return vehicles.filter((v) => v.created_at >= sevenAgo).length;
  }, [vehicles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Need Attention (antrian aksi paling penting) ───────────── */}
      <NeedAttention
        pendingBookings={pendingAll}
        inactivePromos={inactivePromos}
        unverifiedUsers={unverifiedCount}
      />

      {/* ── Quick Access (5 modul utama) ───────────────────────────── */}
      <QuickAccessGrid />

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Welcome back 👋</h2>
          <p className="text-sm text-muted-foreground">Here's what's happening today</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setShowQuickBooking(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Booking
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/customers")} className="gap-1.5">
            <Users className="h-4 w-4" /> Customers
          </Button>
        </div>
      </div>
      <StaffQuickBookingDialog open={showQuickBooking} onOpenChange={setShowQuickBooking} />

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <KPICard icon={CalendarCheck} label="Bookings Today" value={todayBookings.length} trend={todayBookings.length - yesterdayBookings.length} accent />
        <KPICard icon={CalendarCheck} label="Bookings This Week" value={weekBookings.length} />
        {isStaff && (
          <KPICard icon={TrendingUp} label="Revenue Today" value={`Rp ${todayRevenue.toLocaleString("id-ID")}`} trend={todayRevenue - yesterdayRevenue} trendLabel="vs yesterday" />
        )}
        <KPICard icon={CheckCircle2} label="Completed Today" value={completedToday} />
        <KPICard icon={Clock} label="Pending" value={pendingAll} />
        <KPICard icon={Users} label="Customers" value={customerCount} trend={newCustomers7d} trendLabel="new (7d)" />
        <KPICard icon={Car} label="Vehicles" value={vehicleInsights.total} trend={recentVehicles} trendLabel="new (7d)" />
        {isStaff && <KPICard icon={Gift} label="Active Promos" value={activePromos} />}
        <KPICard icon={UserCheck} label="Unverified Users" value={unverifiedCount} accent={unverifiedCount > 0} />
        {isStaff && <KPICard icon={DollarSign} label="Payment Revenue" value={`Rp ${paymentStats.revenue.toLocaleString("id-ID")}`} accent />}
        {isStaff && <KPICard icon={CreditCard} label="Pending Payments" value={paymentStats.pending} accent={paymentStats.pending > 0} />}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Left: Chart + Status + Services ────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          {isStaff && (
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Revenue (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(0,100%,50%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(0,100%,50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: "hsl(220,10%,94%)" }}
                        formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(0,100%,50%)" strokeWidth={2.5} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </GlassCard>
          )}

          {/* Booking Status */}
          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" /> Booking Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(statusConfig).map(([key, cfg]) => {
                  const count = statusCounts[key] || 0;
                  const pct = Math.round((count / totalStatusCount) * 100);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <Badge variant="secondary" className={`${cfg.color} text-xs px-2 py-0.5 min-w-[90px] justify-center`}>
                        {cfg.label}
                      </Badge>
                      <div className="flex-1 h-2 rounded-full bg-muted-foreground/20 overflow-hidden">
                        <div
                          className={`h-full ${cfg.bar} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </GlassCard>

          {/* Top Services */}
          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Top Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No booking data yet</p>
              ) : (
                <div className="space-y-3">
                  {topServices.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <Progress value={(s.count / maxServiceCount) * 100} className="h-1.5 mt-1 bg-muted-foreground/20" />
                      </div>
                      <span className="text-sm font-semibold">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </GlassCard>
        </div>

        {/* ── Right: Activity Feed + Vehicle Insights ────────────────── */}
        <div className="space-y-4">
          {/* Real-time Activity Feed (from activity_logs) */}
          <GlassCard>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Recent Activity
                </CardTitle>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate("/dashboard/history")}>
                  View All →
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {activityLogs.map((log) => {
                    const cfg = activityIconMap[log.type] || { icon: Activity, color: "text-muted-foreground" };
                    const IconComp = cfg.icon;
                    return (
                      <div key={log.id} className="flex items-start gap-3 group">
                        <div className={`mt-0.5 p-1.5 rounded-lg bg-muted ${cfg.color}`}>
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">{log.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0">{log.type}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </GlassCard>

          {/* Vehicle Insights */}
          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" /> Vehicle Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Vehicles</span>
                  <span className="text-sm font-bold">{vehicleInsights.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Car className="h-3 w-3" /> Top Brand</span>
                  <Badge variant="secondary" className="text-xs">{vehicleInsights.topBrand}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Disc3 className="h-3 w-3" /> Top Tire Size</span>
                  <Badge variant="secondary" className="text-xs">{vehicleInsights.topTire}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Truck className="h-3 w-3" /> Added (7d)</span>
                  <Badge variant="secondary" className="text-xs">{recentVehicles}</Badge>
                </div>
              </div>
            </CardContent>
          </GlassCard>

          {/* Module Summary (staff only) */}
          {isStaff && (
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" /> Module Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Gift className="h-3 w-3" /> Active Promos</span>
                    <span className="text-sm font-bold">{activePromos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><XCircle className="h-3 w-3" /> Expired Promos</span>
                    <span className="text-sm font-bold">{inactivePromos}</span>
                  </div>
                </div>
              </CardContent>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
