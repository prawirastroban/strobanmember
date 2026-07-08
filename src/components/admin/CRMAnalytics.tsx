import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserPlus, Repeat, TrendingUp, Trophy, Building2,
  ArrowUpRight, AlertTriangle, Loader2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface BookingRow {
  id: string;
  user_id: string;
  customer_name: string;
  service_name: string;
  service_price: number;
  branch: string | null;
  status: string;
  payment_status: string;
  created_at: string;
}

const fmtRp = (n: number) =>
  "Rp " + (n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const BRANCH_COLORS = ["#E53935", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

interface CRMAnalyticsProps {
  /** ISO start datetime override (e.g. from a shared filter bar). */
  startISO?: string;
  /** ISO end datetime override. */
  endISO?: string;
  /** Branch slug filter ("all" or omitted = all branches). */
  branch?: string;
  /** Hide the internal 30/90/365 day toggle when filters come from outside. */
  hidePeriodToggle?: boolean;
}

export default function CRMAnalytics({ startISO, endISO, branch, hidePeriodToggle }: CRMAnalyticsProps = {}) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<30 | 90 | 365>(30);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let sinceISO = startISO;
      let untilISO = endISO;
      if (!sinceISO) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        sinceISO = since.toISOString();
      }
      let q = supabase
        .from("bookings")
        .select("id,user_id,customer_name,service_name,service_price,branch,status,payment_status,created_at")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (untilISO) q = q.lte("created_at", untilISO);
      if (branch && branch !== "all") q = q.eq("branch", branch);
      const { data, error } = await q;
      if (!error) setBookings((data as BookingRow[]) || []);
      setLoading(false);
    };
    load();
  }, [days, startISO, endISO, branch]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const revenue = bookings
      .filter((b) => b.status === "completed" || b.payment_status === "paid")
      .reduce((s, b) => s + Number(b.service_price || 0), 0);

    // Customer behavior
    const byUser = new Map<string, BookingRow[]>();
    bookings.forEach((b) => {
      if (!b.user_id) return;
      if (!byUser.has(b.user_id)) byUser.set(b.user_id, []);
      byUser.get(b.user_id)!.push(b);
    });
    const uniqueCustomers = byUser.size;
    const repeatCustomers = Array.from(byUser.values()).filter((arr) => arr.length > 1).length;
    const repeatRate = uniqueCustomers ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;
    const avgOrderValue = total ? Math.round(revenue / Math.max(1, completed)) : 0;
    const conversionRate = total ? Math.round((completed / total) * 100) : 0;
    const cancelRate = total ? Math.round((cancelled / total) * 100) : 0;

    // Funnel
    const funnel = {
      created: total,
      paid: bookings.filter((b) => ["paid", "success"].includes(b.payment_status)).length,
      confirmed: bookings.filter((b) => ["confirmed", "checked_in", "in_progress", "completed"].includes(b.status)).length,
      completed,
    };

    // Top 10 customers
    const topCustomers = Array.from(byUser.entries())
      .map(([uid, arr]) => ({
        user_id: uid,
        name: arr[0].customer_name,
        visits: arr.length,
        spent: arr
          .filter((b) => b.status === "completed" || b.payment_status === "paid")
          .reduce((s, b) => s + Number(b.service_price || 0), 0),
        last: arr[0].created_at,
      }))
      .sort((a, b) => b.spent - a.spent || b.visits - a.visits)
      .slice(0, 10);

    // Service popularity
    const byService = new Map<string, number>();
    bookings.forEach((b) => {
      byService.set(b.service_name, (byService.get(b.service_name) || 0) + 1);
    });
    const topServices = Array.from(byService.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Branch distribution
    const byBranch = new Map<string, number>();
    bookings.forEach((b) => {
      const k = b.branch || "tanpa cabang";
      byBranch.set(k, (byBranch.get(k) || 0) + 1);
    });
    const branchData = Array.from(byBranch.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // At-risk customers: had bookings before but not in last 60 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const atRisk = Array.from(byUser.values())
      .filter((arr) => arr.length > 1 && new Date(arr[0].created_at) < cutoff)
      .length;

    return {
      total, completed, cancelled, revenue,
      uniqueCustomers, repeatCustomers, repeatRate,
      avgOrderValue, conversionRate, cancelRate,
      funnel, topCustomers, topServices, branchData, atRisk,
    };
  }, [bookings]);

  const kpis = [
    { label: "Total Pelanggan", value: stats.uniqueCustomers, icon: Users, tone: "text-blue-500", sub: `${stats.total} booking total` },
    { label: "Pelanggan Berulang", value: `${stats.repeatRate}%`, icon: Repeat, tone: "text-emerald-500", sub: `${stats.repeatCustomers} dari ${stats.uniqueCustomers}` },
    { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, tone: "text-violet-500", sub: `${stats.completed} selesai` },
    { label: "Avg. Order Value", value: fmtRp(stats.avgOrderValue), icon: ArrowUpRight, tone: "text-amber-500", sub: `Total ${fmtRp(stats.revenue)}` },
  ];

  if (loading) {
    return (
      <Card><CardContent className="py-10 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Analisis Perilaku Pelanggan
        </h3>
        {!hidePeriodToggle && !startISO && (
        <div className="flex gap-1 rounded-lg border bg-card p-0.5">
          {([30, 90, 365] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {d === 365 ? "1 Tahun" : `${d} Hari`}
            </button>
          ))}
        </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{k.label}</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{k.sub}</p>
                </div>
                <div className={`p-2 rounded-lg bg-muted shrink-0 ${k.tone}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
          <p className="text-xs text-muted-foreground">Booking → Bayar → Konfirmasi → Selesai</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: "Booking Dibuat", v: stats.funnel.created, color: "bg-blue-500" },
              { label: "Sudah Dibayar", v: stats.funnel.paid, color: "bg-violet-500" },
              { label: "Dikonfirmasi", v: stats.funnel.confirmed, color: "bg-amber-500" },
              { label: "Selesai", v: stats.funnel.completed, color: "bg-emerald-500" },
            ].map((row) => {
              const pct = stats.funnel.created ? Math.round((row.v / stats.funnel.created) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground">{row.v} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${row.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Top 10 Pelanggan
            </CardTitle>
            <p className="text-xs text-muted-foreground">Berdasarkan total belanja</p>
          </CardHeader>
          <CardContent>
            {stats.topCustomers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Belum ada data</p>
            ) : (
              <div className="space-y-2">
                {stats.topCustomers.map((c, i) => (
                  <div key={c.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < 3 ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.visits} kunjungan</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmtRp(c.spent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branch distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" /> Distribusi per Cabang
            </CardTitle>
            <p className="text-xs text-muted-foreground">Booking per cabang</p>
          </CardHeader>
          <CardContent>
            {stats.branchData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Belum ada data</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.branchData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {stats.branchData.map((_, i) => (
                        <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insight cards — merged into a single 3-col row */}
      <div className="grid gap-3 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 border-emerald-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pelanggan Baru</p>
                <p className="text-2xl font-bold">{stats.uniqueCustomers - stats.repeatCustomers}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Hanya 1 booking dalam {days} hari terakhir
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${stats.atRisk > 0 ? "from-amber-500/5 border-amber-500/20" : "from-muted/50 border-border"} to-transparent`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${stats.atRisk > 0 ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pelanggan Beresiko Churn</p>
                <p className="text-2xl font-bold">{stats.atRisk}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pelanggan loyal yang tidak booking 60+ hari
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${stats.cancelRate > 15 ? "from-destructive/5 border-destructive/20" : "from-muted/50 border-border"} to-transparent`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${stats.cancelRate > 15 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Cancel Rate</p>
                <p className="text-2xl font-bold">{stats.cancelRate}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {stats.cancelled} booking dibatalkan dari {stats.total}
                </p>
                {stats.cancelRate > 15 && (
                  <Badge variant="outline" className="mt-2 bg-destructive/10 text-destructive border-destructive/30">
                    Perlu perhatian
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Top services — full width so long names don't stack */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Layanan Terpopuler</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topServices.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Belum ada data</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topServices} layout="vertical" margin={{ top: 4, left: 8, right: 24, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={280}
                    interval={0}
                    tickFormatter={(v: string) => (v?.length > 42 ? v.slice(0, 40) + "…" : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
