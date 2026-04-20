import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, CreditCard, AlertTriangle, BarChart3, Loader2, Wrench, CircleDot } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BarChart, Bar, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  booking_id: string;
}

interface Booking {
  id: string;
  service_type: string;
  service_name: string;
  service_price: number;
}

const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const COLORS = ["hsl(var(--primary))", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

const FinanceDashboard = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const since = subDays(new Date(), parseInt(dateRange)).toISOString();
      const [payRes, bookRes] = await Promise.all([
        supabase.from("payments").select("id,amount,payment_method,payment_status,created_at,booking_id").gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("bookings").select("id,service_type,service_name,service_price").gte("created_at", since),
      ]);
      setPayments((payRes.data as Payment[]) || []);
      setBookings((bookRes.data as Booking[]) || []);
      setLoading(false);
    };
    fetch();
  }, [dateRange]);

  const stats = useMemo(() => {
    const success = payments.filter(p => p.payment_status === "success");
    const pending = payments.filter(p => p.payment_status === "pending");
    const failed = payments.filter(p => p.payment_status === "failed");
    const totalRevenue = success.reduce((s, p) => s + Number(p.amount), 0);
    const pendingAmount = pending.reduce((s, p) => s + Number(p.amount), 0);
    return { totalRevenue, totalTx: payments.length, paidTx: success.length, pendingTx: pending.length, failedTx: failed.length, pendingAmount };
  }, [payments]);

  // Daily revenue chart
  const dailyChart = useMemo(() => {
    const days = parseInt(dateRange);
    const result = [];
    for (let i = Math.min(days - 1, 29); i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const dayLabel = format(subDays(new Date(), i), "dd MMM");
      const rev = payments
        .filter(p => p.payment_status === "success" && format(new Date(p.created_at), "yyyy-MM-dd") === d)
        .reduce((s, p) => s + Number(p.amount), 0);
      result.push({ date: dayLabel, revenue: rev });
    }
    return result;
  }, [payments, dateRange]);

  // Monthly revenue chart
  const monthlyChart = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const label = format(month, "MMM yy");
      const rev = payments
        .filter(p => p.payment_status === "success" && new Date(p.created_at) >= start && new Date(p.created_at) <= end)
        .reduce((s, p) => s + Number(p.amount), 0);
      result.push({ month: label, revenue: rev });
    }
    return result;
  }, [payments]);

  // Payment method breakdown
  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter(p => p.payment_status === "success").forEach(p => {
      map[p.payment_method] = (map[p.payment_method] || 0) + Number(p.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [payments]);

  // Service vs tire breakdown
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const type = b.service_type === "tire" ? "Tire" : "Service";
      map[type] = (map[type] || 0) + Number(b.service_price);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  // Daily report table
  const dailyReport = useMemo(() => {
    const days = Math.min(parseInt(dateRange), 30);
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const dayPayments = payments.filter(p => format(new Date(p.created_at), "yyyy-MM-dd") === d);
      const success = dayPayments.filter(p => p.payment_status === "success");
      result.push({
        date: format(subDays(new Date(), i), "dd MMM yyyy"),
        transactions: dayPayments.length,
        revenue: success.reduce((s, p) => s + Number(p.amount), 0),
      });
    }
    return result.filter(r => r.transactions > 0);
  }, [payments, dateRange]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Keuangan
        </h3>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 Hari Terakhir</SelectItem>
            <SelectItem value="14">14 Hari Terakhir</SelectItem>
            <SelectItem value="30">30 Hari Terakhir</SelectItem>
            <SelectItem value="90">90 Hari Terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15"><DollarSign className="h-5 w-5 text-emerald-400" /></div>
            <div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-lg font-bold">{formatIDR(stats.totalRevenue)}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15"><TrendingUp className="h-5 w-5 text-blue-400" /></div>
            <div><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="text-lg font-bold">{stats.totalTx}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15"><CreditCard className="h-5 w-5 text-emerald-400" /></div>
            <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-bold">{stats.paidTx}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15"><AlertTriangle className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold">{formatIDR(stats.pendingAmount)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Revenue */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Harian</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }} formatter={(value: number) => [formatIDR(value), "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Bulanan</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }} formatter={(value: number) => [formatIDR(value), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Method */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Metode Pembayaran</CardTitle></CardHeader>
          <CardContent>
            {methodBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-[150px] w-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={methodBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} strokeWidth={2}>
                        {methodBreakdown.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatIDR(value)} contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {methodBreakdown.map((m, i) => (
                    <div key={m.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="capitalize">{m.name}</span>
                      </div>
                      <span className="font-medium">{formatIDR(m.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service vs Tire */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Service vs Tire Sales</CardTitle></CardHeader>
          <CardContent>
            {typeBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-[150px] w-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} strokeWidth={2}>
                        {typeBreakdown.map((_, i) => (<Cell key={i} fill={i === 0 ? "#3b82f6" : "hsl(var(--primary))"} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatIDR(value)} contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {typeBreakdown.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {t.name === "Service" ? <Wrench className="h-4 w-4 text-blue-400" /> : <CircleDot className="h-4 w-4 text-primary" />}
                        <span>{t.name}</span>
                      </div>
                      <span className="font-medium">{formatIDR(t.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Laporan Harian
            <Badge variant="outline" className="ml-auto text-xs">{dailyReport.length} hari</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyReport.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Transaksi</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReport.map((r) => (
                    <TableRow key={r.date} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="text-center text-sm">{r.transactions}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatIDR(r.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceDashboard;
