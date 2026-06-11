import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, AlertTriangle, BarChart3,
  Wrench, CircleDot, Tag, Wallet, Truck, Receipt, Building2, RefreshCw, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TIMELINE_PRESETS, DEFAULT_TIMELINE, getDateRange, type TimelineValue } from "@/utils/timelineFilter";
import { useBranches } from "@/hooks/useBranches";
import { formatRupiah } from "@/lib/reportFormat";

// ============ Types ============
interface PaymentRow {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  booking_id: string;
}
interface BookingRow {
  id: string;
  service_type: string;
  service_name: string;
  service_price: number;
  discount_amount: number;
  cashback_used: number;
  pickup_fee: number;
  pickup_return_fee: number;
  payment_status: string;
  payment_method: string | null;
  branch: string | null;
  created_at: string;
}
interface TireOrderRow {
  id: string;
  total_amount: number;
  subtotal: number;
  installation_fee: number;
  payment_status: string;
  payment_method: string | null;
  branch: string | null;
  items: any;
  created_at: string;
}
interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  payment_status: string;
  created_at: string;
}

// ============ Helpers ============
const PAID = new Set(["paid", "success", "settled", "captured"]);
const isPaid = (s: string) => PAID.has(String(s || "").toLowerCase());

const COLORS = ["hsl(var(--primary))", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#06b6d4"];
const CHART_TOOLTIP = { background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 };

const dayKey = (iso: string) => iso.slice(0, 10);
const fmtShortDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")} ${["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][d.getMonth()]}`;

function eachDay(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const s = new Date(startISO + "T00:00:00");
  const e = new Date(endISO + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function prevRange(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const ms = e.getTime() - s.getTime();
  const ps = new Date(s.getTime() - ms - 24 * 3600 * 1000);
  const pe = new Date(s.getTime() - 24 * 3600 * 1000);
  return { start: ps.toISOString().slice(0, 10), end: pe.toISOString().slice(0, 10) };
}

function deltaPct(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

// ============ Component ============
const FinanceDashboard = () => {
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const { branches } = useBranches();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [tireOrders, setTireOrders] = useState<TireOrderRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [cashbackLiability, setCashbackLiability] = useState(0);
  const [prevNet, setPrevNet] = useState(0);
  const [prevPaidTx, setPrevPaidTx] = useState(0);

  const { start, end } = useMemo(() => getDateRange(timeline), [timeline]);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    const startISO = `${start}T00:00:00`;
    const endISO = `${end}T23:59:59`;

    let bookingsQ = supabase
      .from("bookings")
      .select("id,service_type,service_name,service_price,discount_amount,cashback_used,pickup_fee,pickup_return_fee,payment_status,payment_method,branch,created_at")
      .gte("created_at", startISO).lte("created_at", endISO);
    let paymentsQ = supabase
      .from("payments")
      .select("id,amount,payment_method,payment_status,created_at,booking_id")
      .gte("created_at", startISO).lte("created_at", endISO);
    let tireQ = supabase
      .from("tire_orders")
      .select("id,total_amount,subtotal,installation_fee,payment_status,payment_method,branch,items,created_at")
      .gte("created_at", startISO).lte("created_at", endISO);
    const invQ = supabase
      .from("invoices")
      .select("id,invoice_number,amount,payment_status,created_at")
      .in("payment_status", ["unpaid", "pay_later"]).order("created_at", { ascending: true });

    if (branchFilter !== "all") {
      bookingsQ = bookingsQ.eq("branch", branchFilter);
      tireQ = tireQ.eq("branch", branchFilter);
    }

    const prev = prevRange(start, end);
    const prevBookQ = supabase
      .from("bookings")
      .select("service_price,discount_amount,cashback_used,pickup_fee,pickup_return_fee,payment_status,branch")
      .gte("created_at", `${prev.start}T00:00:00`).lte("created_at", `${prev.end}T23:59:59`);
    const prevTireQ = supabase
      .from("tire_orders")
      .select("total_amount,payment_status,branch")
      .gte("created_at", `${prev.start}T00:00:00`).lte("created_at", `${prev.end}T23:59:59`);

    const cashbackQ = supabase
      .from("cashback_ledger")
      .select("amount,type")
      .eq("type", "credit");

    const [bRes, pRes, tRes, iRes, pbRes, ptRes, cRes] = await Promise.all([
      bookingsQ, paymentsQ, tireQ, invQ, prevBookQ, prevTireQ, cashbackQ,
    ]);

    const bRows = (bRes.data as BookingRow[]) || [];
    const pRows = (pRes.data as PaymentRow[]) || [];
    const tRows = (tRes.data as TireOrderRow[]) || [];
    setBookings(bRows);
    setPayments(pRows);
    setTireOrders(tRows);
    setInvoices((iRes.data as InvoiceRow[]) || []);

    // cashback liability = total credited (proxy, since no redeem flag column)
    const cl = (cRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    setCashbackLiability(cl);

    // prev period net
    const prevB = ((pbRes.data as any[]) || []).filter(
      (b) => isPaid(b.payment_status) && (branchFilter === "all" || b.branch === branchFilter),
    );
    const prevT = ((ptRes.data as any[]) || []).filter(
      (t) => isPaid(t.payment_status) && (branchFilter === "all" || t.branch === branchFilter),
    );
    const prevGross =
      prevB.reduce((s, b) => s + Number(b.service_price || 0) + Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0), 0) +
      prevT.reduce((s, t) => s + Number(t.total_amount || 0), 0);
    const prevDisc = prevB.reduce((s, b) => s + Number(b.discount_amount || 0), 0);
    const prevCb = prevB.reduce((s, b) => s + Number(b.cashback_used || 0), 0);
    setPrevNet(prevGross - prevDisc - prevCb);
    setPrevPaidTx(prevB.length + prevT.length);

    setLoading(false);
    setRefreshing(false);
  }, [start, end, branchFilter]);

  useEffect(() => { setLoading(true); fetchAll(); }, [fetchAll]);

  // ============ Aggregates ============
  const paidBookings = useMemo(() => bookings.filter((b) => isPaid(b.payment_status)), [bookings]);
  const paidTires = useMemo(() => tireOrders.filter((t) => isPaid(t.payment_status)), [tireOrders]);

  const kpis = useMemo(() => {
    const grossBook = paidBookings.reduce(
      (s, b) => s + Number(b.service_price || 0) + Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0),
      0,
    );
    const grossTire = paidTires.reduce((s, t) => s + Number(t.total_amount || 0), 0);
    const gross = grossBook + grossTire;
    const discount = paidBookings.reduce((s, b) => s + Number(b.discount_amount || 0), 0);
    const cashbackUsed = paidBookings.reduce((s, b) => s + Number(b.cashback_used || 0), 0);
    const net = gross - discount - cashbackUsed;
    const paidTx = paidBookings.length + paidTires.length;
    const aov = paidTx > 0 ? net / paidTx : 0;
    const outstanding =
      bookings.filter((b) => !isPaid(b.payment_status)).reduce((s, b) => s + Number(b.service_price || 0), 0) +
      tireOrders.filter((t) => !isPaid(t.payment_status)).reduce((s, t) => s + Number(t.total_amount || 0), 0);
    const pickupRev = paidBookings.reduce((s, b) => s + Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0), 0);
    return { gross, grossBook, grossTire, pickupRev, discount, cashbackUsed, net, paidTx, aov, outstanding };
  }, [paidBookings, paidTires, bookings, tireOrders]);

  // Daily series
  const dailySeries = useMemo(() => {
    const days = eachDay(start, end);
    const map: Record<string, { date: string; service: number; tire: number; net: number; txPaid: number; txUnpaid: number }> = {};
    days.forEach((d) => { map[d] = { date: d, service: 0, tire: 0, net: 0, txPaid: 0, txUnpaid: 0 }; });
    paidBookings.forEach((b) => {
      const k = dayKey(b.created_at);
      if (!map[k]) return;
      const svc = Number(b.service_price || 0) + Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0);
      const n = svc - Number(b.discount_amount || 0) - Number(b.cashback_used || 0);
      map[k].service += svc;
      map[k].net += n;
      map[k].txPaid += 1;
    });
    paidTires.forEach((t) => {
      const k = dayKey(t.created_at);
      if (!map[k]) return;
      map[k].tire += Number(t.total_amount || 0);
      map[k].net += Number(t.total_amount || 0);
      map[k].txPaid += 1;
    });
    [...bookings, ...tireOrders].forEach((r: any) => {
      if (isPaid(r.payment_status)) return;
      const k = dayKey(r.created_at);
      if (!map[k]) return;
      map[k].txUnpaid += 1;
    });
    return days.map((d) => ({
      ...map[d],
      label: fmtShortDate(new Date(d + "T00:00:00")),
    }));
  }, [start, end, paidBookings, paidTires, bookings, tireOrders]);

  // Payment method breakdown (paid only — combine bookings + tires)
  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    paidBookings.forEach((b) => {
      const m = (b.payment_method || "other").toLowerCase();
      const v = Number(b.service_price || 0) - Number(b.discount_amount || 0) - Number(b.cashback_used || 0);
      map[m] = (map[m] || 0) + Math.max(0, v);
    });
    paidTires.forEach((t) => {
      const m = (t.payment_method || "other").toLowerCase();
      map[m] = (map[m] || 0) + Number(t.total_amount || 0);
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [paidBookings, paidTires]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const out = [
      { name: "Service", value: kpis.grossBook - kpis.pickupRev },
      { name: "Tire", value: kpis.grossTire },
      { name: "Pickup Fee", value: kpis.pickupRev },
    ].filter((x) => x.value > 0);
    return out;
  }, [kpis]);

  // Per branch
  const branchBreakdown = useMemo(() => {
    const map: Record<string, { revenue: number; tx: number }> = {};
    paidBookings.forEach((b) => {
      const k = b.branch || "lainnya";
      if (!map[k]) map[k] = { revenue: 0, tx: 0 };
      const v = Number(b.service_price || 0) + Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0) -
        Number(b.discount_amount || 0) - Number(b.cashback_used || 0);
      map[k].revenue += v;
      map[k].tx += 1;
    });
    paidTires.forEach((t) => {
      const k = t.branch || "lainnya";
      if (!map[k]) map[k] = { revenue: 0, tx: 0 };
      map[k].revenue += Number(t.total_amount || 0);
      map[k].tx += 1;
    });
    const labelOf = (slug: string) => branches.find((b) => b.slug === slug)?.name || slug;
    return Object.entries(map)
      .map(([slug, v]) => ({ name: labelOf(slug), revenue: v.revenue, tx: v.tx }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [paidBookings, paidTires, branches]);

  // Top services
  const topServices = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    paidBookings.forEach((b) => {
      const name = b.service_name || "Lainnya";
      if (!map[name]) map[name] = { qty: 0, revenue: 0 };
      map[name].qty += 1;
      map[name].revenue += Number(b.service_price || 0) - Number(b.discount_amount || 0) - Number(b.cashback_used || 0);
    });
    const total = Object.values(map).reduce((s, x) => s + x.revenue, 0) || 1;
    return Object.entries(map)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue, share: (v.revenue / total) * 100 }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [paidBookings]);

  // Top tires (from items[])
  const topTires = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    paidTires.forEach((t) => {
      const items = Array.isArray(t.items) ? t.items : [];
      items.forEach((it: any) => {
        const label = [it.brand, it.model, it.size].filter(Boolean).join(" ") || it.name || "Tire";
        if (!map[label]) map[label] = { qty: 0, revenue: 0 };
        const qty = Number(it.quantity || it.qty || 1);
        const price = Number(it.price || it.unit_price || 0) * qty;
        map[label].qty += qty;
        map[label].revenue += price;
      });
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [paidTires]);

  // Aging buckets for unpaid invoices
  const aging = useMemo(() => {
    const now = Date.now();
    const b = { d0_7: 0, d8_30: 0, d30p: 0, count0_7: 0, count8_30: 0, count30p: 0 };
    invoices.forEach((inv) => {
      const age = Math.floor((now - new Date(inv.created_at).getTime()) / (1000 * 3600 * 24));
      const amt = Number(inv.amount || 0);
      if (age <= 7) { b.d0_7 += amt; b.count0_7 += 1; }
      else if (age <= 30) { b.d8_30 += amt; b.count8_30 += 1; }
      else { b.d30p += amt; b.count30p += 1; }
    });
    return b;
  }, [invoices]);

  // Daily report rows (filter days with activity, take last 30)
  const dailyReport = useMemo(() => {
    const map: Record<string, { date: string; tx: number; gross: number; discount: number; cashback: number; net: number }> = {};
    paidBookings.forEach((b) => {
      const k = dayKey(b.created_at);
      if (!map[k]) map[k] = { date: k, tx: 0, gross: 0, discount: 0, cashback: 0, net: 0 };
      const g = Number(b.service_price || 0) + Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0);
      map[k].tx += 1;
      map[k].gross += g;
      map[k].discount += Number(b.discount_amount || 0);
      map[k].cashback += Number(b.cashback_used || 0);
      map[k].net += g - Number(b.discount_amount || 0) - Number(b.cashback_used || 0);
    });
    paidTires.forEach((t) => {
      const k = dayKey(t.created_at);
      if (!map[k]) map[k] = { date: k, tx: 0, gross: 0, discount: 0, cashback: 0, net: 0 };
      const g = Number(t.total_amount || 0);
      map[k].tx += 1;
      map[k].gross += g;
      map[k].net += g;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }, [paidBookings, paidTires]);

  // ============ Render ============
  const netDelta = deltaPct(kpis.net, prevNet);
  const txDelta = deltaPct(kpis.paidTx, prevPaidTx);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Keuangan</h3>
          <Badge variant="outline" className="text-[10px]">{start} → {end}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={timeline.preset} onValueChange={(v) => setTimeline({ preset: v as any })}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMELINE_PRESETS.filter((p) => p.value !== "custom").map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.slug}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={refreshing} className="h-9">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<DollarSign className="h-5 w-5 text-emerald-400" />} tint="emerald" label="Gross Revenue" value={formatRupiah(kpis.gross)} href="/dashboard/history?tab=payments&payment_status=success" />
          <KpiCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} tint="emerald" label="Net Revenue" value={formatRupiah(kpis.net)} delta={netDelta} hint="vs periode sebelumnya" href="/dashboard/keuangan/report" />
          <KpiCard icon={<Tag className="h-5 w-5 text-amber-400" />} tint="amber" label="Diskon Diberikan" value={formatRupiah(kpis.discount)} href="/dashboard/history?tab=promo" />
          <KpiCard icon={<Wallet className="h-5 w-5 text-violet-400" />} tint="violet" label="Cashback Terpakai" value={formatRupiah(kpis.cashbackUsed)} href="/dashboard/history?tab=referral" />
          <KpiCard icon={<Receipt className="h-5 w-5 text-blue-400" />} tint="blue" label="Transaksi Paid" value={String(kpis.paidTx)} delta={txDelta} href="/dashboard/history?tab=payments&payment_status=success" />
          <KpiCard icon={<CreditCard className="h-5 w-5 text-blue-400" />} tint="blue" label="AOV" value={formatRupiah(kpis.aov)} hint="Rata-rata per transaksi" href="/dashboard/history?tab=payments&payment_status=success" />
          <KpiCard icon={<AlertTriangle className="h-5 w-5 text-primary" />} tint="primary" label="Outstanding" value={formatRupiah(kpis.outstanding)} hint="Belum dibayar" href="/dashboard/history?tab=payments&payment_status=unpaid" />
          <KpiCard icon={<Wallet className="h-5 w-5 text-violet-400" />} tint="violet" label="Cashback Liability" value={formatRupiah(cashbackLiability)} hint="Saldo cashback aktif" href="/dashboard/keuangan/referral" />
        </div>
      )}

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tren Revenue Harian (Service + Tire, stacked)</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[240px] rounded-xl" /> : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number) => formatRupiah(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" stackId="1" dataKey="service" name="Service" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                    <Area type="monotone" stackId="1" dataKey="tire" name="Tire" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tren Transaksi Harian (Paid vs Belum)</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[240px] rounded-xl" /> : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="txPaid" stackId="a" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="txUnpaid" stackId="a" name="Belum" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieCard title="Metode Pembayaran" data={methodBreakdown} emptyText="Belum ada pembayaran" />
        <PieCard title="Sumber Revenue" data={sourceBreakdown} emptyText="Belum ada data" iconPerRow />
      </div>

      {/* Branch breakdown */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Revenue per Cabang</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[220px] rounded-xl" /> : branchBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data</p>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchBreakdown} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                  <XAxis type="number" tick={{ fill: "hsl(220,8%,55%)", fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fill: "hsl(220,8%,70%)", fontSize: 11 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number, name) => name === "revenue" ? formatRupiah(v) : v} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top services & tires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopTable title="Top 10 Layanan" rows={topServices} icon={<Wrench className="h-4 w-4 text-blue-400" />} loading={loading} showShare />
        <TopTable title="Top 10 Ban" rows={topTires} icon={<CircleDot className="h-4 w-4 text-primary" />} loading={loading} />
      </div>

      {/* Aging outstanding */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" /> Aging Invoice Outstanding
            <Badge variant="outline" className="ml-auto text-xs">{invoices.length} invoice</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <AgingCell label="0–7 hari" amount={aging.d0_7} count={aging.count0_7} color="text-emerald-400" />
            <AgingCell label="8–30 hari" amount={aging.d8_30} count={aging.count8_30} color="text-amber-400" />
            <AgingCell label="> 30 hari" amount={aging.d30p} count={aging.count30p} color="text-primary" />
          </div>
          {invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada invoice outstanding</p>
          ) : (
            <div className="overflow-x-auto max-h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Umur (hari)</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 30).map((inv) => {
                    const age = Math.floor((Date.now() - new Date(inv.created_at).getTime()) / 86400000);
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm font-mono">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm">{fmtShortDate(new Date(inv.created_at))} {new Date(inv.created_at).getFullYear()}</TableCell>
                        <TableCell className="text-center text-sm">{age}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatRupiah(Number(inv.amount))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily report */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Laporan Harian
            <Badge variant="outline" className="ml-auto text-xs">{dailyReport.length} hari</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[200px] rounded-xl" /> : dailyReport.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Tx</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Diskon</TableHead>
                    <TableHead className="text-right">Cashback</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReport.map((r) => (
                    <TableRow key={r.date} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{fmtShortDate(new Date(r.date + "T00:00:00"))} {new Date(r.date).getFullYear()}</TableCell>
                      <TableCell className="text-center text-sm">{r.tx}</TableCell>
                      <TableCell className="text-right text-sm">{formatRupiah(r.gross)}</TableCell>
                      <TableCell className="text-right text-sm text-amber-400">−{formatRupiah(r.discount)}</TableCell>
                      <TableCell className="text-right text-sm text-violet-400">−{formatRupiah(r.cashback)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-400">{formatRupiah(r.net)}</TableCell>
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

// ============ Sub-components ============
const tintBg: Record<string, string> = {
  emerald: "bg-emerald-500/15",
  amber: "bg-amber-500/15",
  violet: "bg-violet-500/15",
  blue: "bg-blue-500/15",
  primary: "bg-primary/15",
};

function KpiCard({ icon, tint, label, value, delta, hint, href }: {
  icon: React.ReactNode; tint: keyof typeof tintBg; label: string; value: string; delta?: number | null; hint?: string; href?: string;
}) {
  const card = (
    <Card className={`bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl transition-all duration-200 ${href ? "group hover:ring-1 hover:ring-primary/40 hover:-translate-y-0.5 cursor-pointer" : ""}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${tintBg[tint]}`}>{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-base font-bold truncate">{value}</p>
          </div>
        </div>
        {(delta !== undefined && delta !== null) || hint ? (
          <div className="mt-2 flex items-center justify-between text-[10px]">
            {hint && <span className="text-muted-foreground truncate">{hint}</span>}
            {delta !== undefined && delta !== null && (
              <span className={`flex items-center gap-0.5 font-medium ${delta >= 0 ? "text-emerald-400" : "text-primary"}`}>
                {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
  if (href) return <Link to={href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${label}: ${value}`}>{card}</Link>;
  return card;
}

function PieCard({ title, data, emptyText, iconPerRow }: {
  title: string; data: { name: string; value: number }[]; emptyText: string; iconPerRow?: boolean;
}) {
  const iconFor = (name: string) =>
    name === "Service" ? <Wrench className="h-4 w-4 text-blue-400" /> :
    name === "Tire" ? <CircleDot className="h-4 w-4 text-primary" /> :
    name === "Pickup Fee" ? <Truck className="h-4 w-4 text-amber-400" /> :
    <CreditCard className="h-4 w-4 text-muted-foreground" />;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">{emptyText}</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-[150px] w-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} strokeWidth={2}>
                    {data.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number) => formatRupiah(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {data.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {iconPerRow ? iconFor(m.name) : <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />}
                    <span className="capitalize truncate">{m.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-medium">{formatRupiah(m.value)}</div>
                    <div className="text-[10px] text-muted-foreground">{((m.value / total) * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopTable({ title, rows, icon, loading, showShare }: {
  title: string; rows: { name: string; qty: number; revenue: number; share?: number }[]; icon: React.ReactNode; loading: boolean; showShare?: boolean;
}) {
  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-[200px] rounded-xl" /> : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">Belum ada data</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                {showShare && <TableHead className="text-right">Share</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name} className="hover:bg-muted/30">
                  <TableCell className="text-sm truncate max-w-[180px]">{r.name}</TableCell>
                  <TableCell className="text-center text-sm">{r.qty}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatRupiah(r.revenue)}</TableCell>
                  {showShare && <TableCell className="text-right text-xs text-muted-foreground">{r.share?.toFixed(1)}%</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AgingCell({ label, amount, count, color }: { label: string; amount: number; count: number; color: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${color}`}>{formatRupiah(amount)}</p>
      <p className="text-[10px] text-muted-foreground">{count} invoice</p>
    </div>
  );
}

export default FinanceDashboard;
