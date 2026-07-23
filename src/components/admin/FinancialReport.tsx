import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, TrendingUp, TrendingDown, Tag, Gift, Users, ShieldCheck, Wallet, Activity, Percent } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend } from "recharts";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { DEFAULT_TIMELINE, type TimelineValue } from "@/utils/timelineFilter";
import FinancialFilters from "./financial/FinancialFilters";
import { useFinancialData, classifyBooking, bookingNet, bookingGross, isPaid, isPaidTire, type FinFilters, type PaymentCategory } from "./financial/useFinancialData";
import { useBranches } from "@/hooks/useBranches";
import { useBranding } from "@/hooks/useBranding";
import { exportFinancialExcel, type FinancialExportPayload } from "./financial/exporters/exportFinancialExcel";
import { exportFinancialPdf } from "./financial/exporters/exportFinancialPdf";

const formatIDR = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const fmtNum = (n: number) => n.toLocaleString("id-ID");

const CATEGORY_LABEL: Record<PaymentCategory, string> = {
  full: "Full Payment", partial: "Partial Payment", promo: "Promo Applied",
  loyalty: "Loyalty Redemption", referral: "Referral Reward", free: "Free Service",
  warranty: "Warranty / Claim", manual: "Manual Adjustment",
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#06b6d4", "#ef4444", "#64748b"];

// --- Tiny reusable KPI card ---
const KpiCard = ({ icon: Icon, label, value, sub, tone = "primary", href }: { icon: any; label: string; value: string; sub?: string; tone?: string; href?: string }) => {
  const body = (
    <Card className={`bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl transition-all duration-200 ${href ? "group hover:ring-1 hover:ring-primary/40 hover:-translate-y-0.5 cursor-pointer" : ""}`}>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-${tone}/15`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
  if (!href) return body;
  return <Link to={href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${label}: ${value}`}>{body}</Link>;
};

const Section = ({ title, icon: Icon, children, action }: any) => (
  <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
    <CardHeader className="pb-2 flex flex-row items-center justify-between">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </CardTitle>
      {action}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const FinancialReport = () => {
  const [filters, setFilters] = useState<FinFilters>({
    timeline: DEFAULT_TIMELINE, branch: "", customer: "", promoId: "", status: "",
  });
  const data = useFinancialData(filters);
  const { branches } = useBranches();
  const { branding } = useBranding();
  const [loyaltyPeriod, setLoyaltyPeriod] = useState<"day" | "week" | "month">("month");

  // ----- KPIs -----
  const kpi = useMemo(() => {
    const paid = data.bookings.filter(isPaid);
    const gross = paid.reduce((s, b) => s + bookingGross(b), 0)
      + data.tireOrders.filter(isPaidTire).reduce((s, t) => s + Number(t.total_amount || 0), 0);
    const net = paid.reduce((s, b) => s + bookingNet(b), 0)
      + data.tireOrders.filter(isPaidTire).reduce((s, t) => s + Number(t.total_amount || 0), 0);
    const totalBooking = data.bookings.length;
    const aov = paid.length ? net / paid.length : 0;
    const today = startOfDay(new Date()).getTime();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
    const monthStart = startOfMonth(new Date()).getTime();
    const revToday = paid.filter((b) => new Date(b.created_at).getTime() >= today).reduce((s, b) => s + bookingNet(b), 0);
    const revWeek = paid.filter((b) => new Date(b.created_at).getTime() >= weekStart).reduce((s, b) => s + bookingNet(b), 0);
    const revMonth = paid.filter((b) => new Date(b.created_at).getTime() >= monthStart).reduce((s, b) => s + bookingNet(b), 0);
    const prevPaid = data.prevBookings.filter(isPaid);
    const prevNet = prevPaid.reduce((s, b) => s + bookingNet(b), 0);
    const delta = prevNet > 0 ? ((net - prevNet) / prevNet) * 100 : 0;
    return { gross, net, totalBooking, aov, revToday, revWeek, revMonth, delta, paidCount: paid.length };
  }, [data]);

  // ----- Section 2: Payment Breakdown -----
  const paymentBreakdown = useMemo(() => {
    const map = new Map<PaymentCategory, { count: number; revenue: number }>();
    (["full","partial","promo","loyalty","referral","free","warranty","manual"] as PaymentCategory[])
      .forEach((c) => map.set(c, { count: 0, revenue: 0 }));
    data.bookings.forEach((b) => {
      const c = classifyBooking(b);
      const cur = map.get(c)!;
      cur.count++;
      cur.revenue += isPaid(b) ? bookingNet(b) : 0;
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v.revenue, 0);
    return Array.from(map.entries()).map(([cat, v]) => ({
      category: CATEGORY_LABEL[cat], cat, count: v.count, revenue: v.revenue,
      pct: total ? (v.revenue / total) * 100 : 0,
    }));
  }, [data.bookings]);

  // ----- Section 3: Promo Analytics -----
  const promoAnalytics = useMemo(() => {
    const promoIdToTitle = new Map(data.promos.map((p) => [p.id, p.title]));
    const claimToPromo = new Map(data.promoClaims.map((c) => [c.id, c.promo_id]));
    const usedTotal = data.promoClaims.filter((c) => c.used_at).length;
    const promoBookings = data.bookings.filter((b) => b.promo_claim_id || b.discount_source === "promo");
    const totalPotongan = promoBookings.reduce((s, b) => s + Number(b.discount_amount || 0), 0);
    const totalRevenue = promoBookings.filter(isPaid).reduce((s, b) => s + bookingNet(b), 0);
    const byPromo = new Map<string, { name: string; used: number; potongan: number; revenue: number }>();
    promoBookings.forEach((b) => {
      const pid = (b.promo_claim_id && claimToPromo.get(b.promo_claim_id)) || "";
      const name = (pid && promoIdToTitle.get(pid)) || b.discount_code || "Promo Lain";
      const cur = byPromo.get(name) || { name, used: 0, potongan: 0, revenue: 0 };
      cur.used++;
      cur.potongan += Number(b.discount_amount || 0);
      if (isPaid(b)) cur.revenue += bookingNet(b);
      byPromo.set(name, cur);
    });
    return {
      usedTotal, totalPotongan, totalRevenue,
      bookingCount: promoBookings.length,
      perPromo: Array.from(byPromo.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }, [data]);

  // ----- Section 4: Loyalty Analytics -----
  const loyaltyAnalytics = useMemo(() => {
    const now = new Date();
    const startTs =
      loyaltyPeriod === "day" ? startOfDay(now).getTime()
        : loyaltyPeriod === "week" ? startOfWeek(now, { weekStartsOn: 1 }).getTime()
        : startOfMonth(now).getTime();
    const txns = data.loyaltyTxns.filter((t) => new Date(t.created_at).getTime() >= startTs);
    const given = txns.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0);
    const redeemedPts = txns.filter((t) => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0);
    const reds = data.redemptions.filter((r) => new Date(r.created_at).getTime() >= startTs);
    const redValue = reds.reduce((s, r) => {
      const dt = r.rewards?.discount_type; const dv = Number(r.rewards?.discount_value || 0);
      if (dt === "fixed") return s + dv;
      return s; // percentage value can't be summed without booking
    }, 0);
    const customers = new Set(reds.map((r) => r.user_id)).size;
    return { given, redeemedPts, redValue, customers, count: reds.length };
  }, [data.loyaltyTxns, data.redemptions, loyaltyPeriod]);

  // ----- Section 5: Referral Analytics -----
  const referralAnalytics = useMemo(() => {
    const refed = new Set(data.referrals.map((r) => r.referee_id)).size;
    const bookingRefs = data.referrals.filter((r) => r.type === "booking");
    const totalRev = bookingRefs.reduce((s, r) => s + Number(r.amount || 0), 0);
    const map = new Map<string, { name: string; phone: string | null; referrals: number; bookings: number; revenue: number }>();
    data.referrals.forEach((r) => {
      const p = data.profilesById[r.referrer_id];
      const name = p?.full_name || r.referrer_id.slice(0, 8);
      const cur = map.get(r.referrer_id) || { name, phone: p?.phone || null, referrals: 0, bookings: 0, revenue: 0 };
      cur.referrals++;
      if (r.type === "booking") { cur.bookings++; cur.revenue += Number(r.amount || 0); }
      map.set(r.referrer_id, cur);
    });
    return { refed, bookings: bookingRefs.length, totalRev, perReferrer: Array.from(map.values()).sort((a, b) => b.revenue - a.revenue) };
  }, [data]);

  // ----- Section 6: Free Service & Claim -----
  const freeClaim = useMemo(() => {
    const free = data.bookings.filter((b) => Number(b.service_price || 0) === 0);
    return {
      freeCount: free.length,
      freeValue: 0, // by definition revenue=0; cost = original_service_price (often null)
      warrantyCount: 0, warrantyValue: 0,
      claimCount: 0, claimValue: 0,
    };
  }, [data.bookings]);

  // ----- Section 7: Discount Cost -----
  const discountCost = useMemo(() => {
    const promo = data.bookings.filter((b) => b.discount_source === "promo" || b.promo_claim_id).reduce((s, b) => s + Number(b.discount_amount || 0), 0);
    const loyalty = data.bookings.filter((b) => b.discount_source === "reward" || b.discount_source === "loyalty").reduce((s, b) => s + Number(b.discount_amount || 0), 0)
      + loyaltyAnalytics.redValue;
    const referral = data.bookings.reduce((s, b) => s + Number(b.cashback_used || 0), 0)
      + data.referrals.filter((r) => r.type === "booking").reduce((s, r) => s + Number(r.amount || 0), 0);
    const manual = data.bookings.filter((b) => b.discount_source === "manual").reduce((s, b) => s + Number(b.discount_amount || 0), 0);
    return { promo, loyalty, referral, manual, total: promo + loyalty + referral + manual };
  }, [data, loyaltyAnalytics.redValue]);

  // ----- Section 8: Net Revenue -----
  const netRevenue = useMemo(() => {
    const gross = kpi.gross;
    const freeCost = 0; // can't measure without original_service_price reliably
    const net = gross - discountCost.promo - discountCost.loyalty - discountCost.referral - freeCost;
    return { gross, freeCost, net };
  }, [kpi.gross, discountCost]);

  // ----- Trend monthly (last 6 mo from bookings range) -----
  const monthlyTrend = useMemo(() => {
    const buckets: Record<string, { month: string; gross: number; net: number }> = {};
    data.bookings.filter(isPaid).forEach((b) => {
      const k = format(new Date(b.created_at), "MMM yy");
      buckets[k] = buckets[k] || { month: k, gross: 0, net: 0 };
      buckets[k].gross += bookingGross(b);
      buckets[k].net += bookingNet(b);
    });
    return Object.values(buckets);
  }, [data.bookings]);

  // ----- Section 9: Top Insight -----
  const insights = useMemo(() => {
    const out: string[] = [];
    if (promoAnalytics.perPromo[0]) {
      out.push(`Promo "${promoAnalytics.perPromo[0].name}" menghasilkan revenue tertinggi: ${formatIDR(promoAnalytics.perPromo[0].revenue)} dari ${promoAnalytics.perPromo[0].used} transaksi.`);
    }
    // top branch by promo usage
    const branchPromo = new Map<string, number>();
    data.bookings.filter((b) => b.promo_claim_id || b.discount_source === "promo").forEach((b) => {
      const k = b.branch || "Lainnya"; branchPromo.set(k, (branchPromo.get(k) || 0) + 1);
    });
    const top = Array.from(branchPromo.entries()).sort((a, b) => b[1] - a[1])[0];
    if (top) out.push(`Cabang "${top[0]}" memiliki penggunaan promo tertinggi (${top[1]} transaksi).`);
    if (data.bookings.length && referralAnalytics.bookings) {
      const pct = (referralAnalytics.bookings / data.bookings.length) * 100;
      out.push(`Referral menghasilkan ${pct.toFixed(1)}% dari total booking periode ini.`);
    }
    if (kpi.delta !== 0) {
      out.push(`Net revenue ${kpi.delta >= 0 ? "naik" : "turun"} ${Math.abs(kpi.delta).toFixed(1)}% dibanding periode sebelumnya.`);
    }
    if (freeClaim.freeCount) {
      out.push(`Terdapat ${freeClaim.freeCount} free service yang ditangani periode ini.`);
    }
    if (out.length === 0) out.push("Belum ada cukup data untuk menghasilkan insight pada periode ini.");
    return out;
  }, [promoAnalytics, data.bookings, referralAnalytics, kpi.delta, freeClaim.freeCount]);

  // ----- Export -----
  const buildExportPayload = (): FinancialExportPayload => {
    const branchName = filters.branch ? (branches.find((b) => b.slug === filters.branch)?.name || filters.branch) : "Semua Cabang";
    return {
      meta: {
        period: `${data.range.start} → ${data.range.end}`,
        branch: branchName,
        customer: filters.customer,
        promo: data.promos.find((p) => p.id === filters.promoId)?.title || "",
        status: filters.status,
      },
      kpi: {
        "Gross Revenue": formatIDR(kpi.gross),
        "Net Revenue": formatIDR(kpi.net),
        "Total Booking": kpi.totalBooking,
        "AOV": formatIDR(kpi.aov),
        "Revenue Hari Ini": formatIDR(kpi.revToday),
        "Revenue Minggu Ini": formatIDR(kpi.revWeek),
        "Revenue Bulan Ini": formatIDR(kpi.revMonth),
      },
      paymentBreakdown: paymentBreakdown.map((r) => ({ category: r.category, count: r.count, revenue: r.revenue, pct: r.pct })),
      promoTable: promoAnalytics.perPromo.map((p) => ({ promo: p.name, used: p.used, potongan: p.potongan, revenue: p.revenue })),
      loyalty: [
        { metric: "Point Diberikan", value: loyaltyAnalytics.given },
        { metric: "Point Ditukar", value: loyaltyAnalytics.redeemedPts },
        { metric: "Nilai Penukaran (Rp)", value: loyaltyAnalytics.redValue },
        { metric: "Customer Pakai Loyalty", value: loyaltyAnalytics.customers },
      ],
      referralTable: referralAnalytics.perReferrer.map((r) => ({ referrer: r.name, referrals: r.referrals, bookings: r.bookings, revenue: r.revenue })),
      freeClaim: [
        { category: "Free Service", count: freeClaim.freeCount, value: freeClaim.freeValue },
        { category: "Warranty", count: freeClaim.warrantyCount, value: freeClaim.warrantyValue },
        { category: "Claim", count: freeClaim.claimCount, value: freeClaim.claimValue },
      ],
      discountCost: [
        { source: "Promo", amount: discountCost.promo },
        { source: "Loyalty", amount: discountCost.loyalty },
        { source: "Referral / Cashback", amount: discountCost.referral },
        { source: "Manual Discount", amount: discountCost.manual },
        { source: "TOTAL", amount: discountCost.total },
      ],
      netRevenue: [
        { label: "Gross Revenue", amount: netRevenue.gross },
        { label: "(-) Promo Cost", amount: discountCost.promo },
        { label: "(-) Loyalty Cost", amount: discountCost.loyalty },
        { label: "(-) Referral Cost", amount: discountCost.referral },
        { label: "(-) Free Service Cost", amount: netRevenue.freeCost },
        { label: "= NET REVENUE", amount: netRevenue.net },
      ],
      insights,
    };
  };

  if (data.loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <FinancialFilters
        filters={filters}
        setFilters={setFilters}
        promos={data.promos}
        onExportExcel={() => exportFinancialExcel(buildExportPayload())}
        onExportPdf={() => exportFinancialPdf(branding?.brand_name || "Bengkel Mobil Stroban", buildExportPayload())}
        onRefresh={data.refetch}
      />

      {/* Section 1: Revenue Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="Gross Revenue" value={formatIDR(kpi.gross)} href="/dashboard/history?tab=payments&payment_status=success" />
        <KpiCard
          icon={kpi.delta >= 0 ? TrendingUp : TrendingDown}
          label="Net Revenue"
          value={formatIDR(kpi.net)}
          sub={`${kpi.delta >= 0 ? "▲" : "▼"} ${Math.abs(kpi.delta).toFixed(1)}% vs prev`}
          href="/dashboard/history?tab=payments&payment_status=success"
        />
        <KpiCard icon={Activity} label="Total Booking" value={fmtNum(kpi.totalBooking)} sub={`${kpi.paidCount} paid`} href="/dashboard/history?tab=bookings" />
        <KpiCard icon={Percent} label="AOV" value={formatIDR(kpi.aov)} href="/dashboard/history?tab=payments&payment_status=success" />
        <KpiCard icon={DollarSign} label="Revenue Hari Ini" value={formatIDR(kpi.revToday)} href="/dashboard/history?tab=payments&payment_status=success&date_preset=today" />
        <KpiCard icon={DollarSign} label="Revenue Bulan Ini" value={formatIDR(kpi.revMonth)} sub={`Minggu ini: ${formatIDR(kpi.revWeek)}`} href="/dashboard/history?tab=payments&payment_status=success&date_preset=month" />
      </div>

      {/* Section 2: Payment Breakdown */}
      <Section title="Payment Breakdown" icon={Wallet}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="text-left p-2">Kategori</th><th className="text-right p-2">Tx</th><th className="text-right p-2">Revenue</th><th className="text-right p-2">%</th></tr>
              </thead>
              <tbody>
                {paymentBreakdown.map((r, i) => (
                  <tr key={r.cat} className="border-t border-border/30">
                    <td className="p-2 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {r.category}
                      {(r.cat === "warranty" || r.cat === "manual") && <span className="text-[10px] text-muted-foreground">(belum diaktifkan)</span>}
                    </td>
                    <td className="p-2 text-right">{r.count}</td>
                    <td className="p-2 text-right font-medium">{formatIDR(r.revenue)}</td>
                    <td className="p-2 text-right text-muted-foreground">{r.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentBreakdown.filter((r) => r.revenue > 0)} dataKey="revenue" nameKey="category" outerRadius={90} label={(d: any) => `${d.pct.toFixed(0)}%`}>
                  {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatIDR(v)} contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* Section 3: Promo Analytics */}
      <Section title="Promo Analytics" icon={Tag}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KpiCard icon={Tag} label="Promo Digunakan" value={fmtNum(promoAnalytics.usedTotal)} href="/dashboard/history?tab=promo" />
          <KpiCard icon={DollarSign} label="Total Potongan" value={formatIDR(promoAnalytics.totalPotongan)} href="/dashboard/history?tab=promo" />
          <KpiCard icon={Activity} label="Booking Pakai Promo" value={fmtNum(promoAnalytics.bookingCount)} href="/dashboard/history?tab=bookings" />
          <KpiCard icon={DollarSign} label="Revenue Dari Promo" value={formatIDR(promoAnalytics.totalRevenue)} href="/dashboard/history?tab=promo" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left p-2">Promo</th><th className="text-right p-2">Digunakan</th><th className="text-right p-2">Total Potongan</th><th className="text-right p-2">Revenue</th></tr></thead>
            <tbody>
              {promoAnalytics.perPromo.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Belum ada promo digunakan pada periode ini.</td></tr>}
              {promoAnalytics.perPromo.map((p) => (
                <tr key={p.name} className="border-t border-border/30">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 text-right">{p.used}</td>
                  <td className="p-2 text-right">{formatIDR(p.potongan)}</td>
                  <td className="p-2 text-right font-medium">{formatIDR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 4: Loyalty Analytics */}
      <Section
        title="Loyalty Analytics"
        icon={Gift}
        action={
          <div className="flex gap-1">
            {(["day","week","month"] as const).map((p) => (
              <button key={p} onClick={() => setLoyaltyPeriod(p)} className={`text-xs px-2 py-1 rounded-md ${loyaltyPeriod === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {p === "day" ? "Hari" : p === "week" ? "Minggu" : "Bulan"}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Gift} label="Point Diberikan" value={fmtNum(loyaltyAnalytics.given)} href="/dashboard/history?tab=loyalty&loyalty=earn" />
          <KpiCard icon={Gift} label="Point Ditukar" value={fmtNum(loyaltyAnalytics.redeemedPts)} href="/dashboard/history?tab=loyalty&loyalty=redeem" />
          <KpiCard icon={DollarSign} label="Nilai Penukaran" value={formatIDR(loyaltyAnalytics.redValue)} sub={`${loyaltyAnalytics.count} redemption`} href="/dashboard/history?tab=loyalty&loyalty=redeem" />
          <KpiCard icon={Users} label="Customer Pakai Loyalty" value={fmtNum(loyaltyAnalytics.customers)} href="/dashboard/history?tab=loyalty" />
        </div>
      </Section>

      {/* Section 5: Referral Analytics */}
      <Section title="Referral Analytics" icon={Users}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <KpiCard icon={Users} label="Customer Direferensikan" value={fmtNum(referralAnalytics.refed)} href="/dashboard/history?tab=referral" />
          <KpiCard icon={Activity} label="Booking Dari Referral" value={fmtNum(referralAnalytics.bookings)} href="/dashboard/history?tab=referral" />
          <KpiCard icon={DollarSign} label="Revenue Dari Referral" value={formatIDR(referralAnalytics.totalRev)} href="/dashboard/history?tab=referral" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left p-2">Referrer</th><th className="text-right p-2">Referral</th><th className="text-right p-2">Booking Berhasil</th><th className="text-right p-2">Revenue</th></tr></thead>
            <tbody>
              {referralAnalytics.perReferrer.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Belum ada referral pada periode ini.</td></tr>}
              {referralAnalytics.perReferrer.map((r) => (
                <tr key={r.name + (r.phone || "")} className="border-t border-border/30">
                  <td className="p-2">{r.name}{r.phone && <span className="text-xs text-muted-foreground ml-1">({r.phone})</span>}</td>
                  <td className="p-2 text-right">{r.referrals}</td>
                  <td className="p-2 text-right">{r.bookings}</td>
                  <td className="p-2 text-right font-medium">{formatIDR(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 6: Free Service & Claim */}
      <Section title="Free Service & Claim" icon={ShieldCheck}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Gift} label="Free Service" value={fmtNum(freeClaim.freeCount)} sub="Tidak ada revenue" href="/dashboard/history?tab=bookings" />
          <KpiCard icon={ShieldCheck} label="Warranty" value={fmtNum(freeClaim.warrantyCount)} sub="Butuh kolom transaction_kind" />
          <KpiCard icon={ShieldCheck} label="Claim" value={fmtNum(freeClaim.claimCount)} sub="Butuh kolom transaction_kind" />
          <KpiCard icon={DollarSign} label="Total Cost Ditanggung" value={formatIDR(freeClaim.freeValue + freeClaim.warrantyValue + freeClaim.claimValue)} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Catatan: Warranty / Claim / Manual Adjustment belum aktif karena field <code>transaction_kind</code> belum ditambahkan ke tabel bookings. Lihat plan untuk migration opsional.
        </p>
      </Section>

      {/* Section 7: Discount Cost */}
      <Section title="Discount Cost Report" icon={Percent}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 rounded bg-muted/30"><span>Promo</span><span className="font-medium">{formatIDR(discountCost.promo)}</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span>Loyalty</span><span className="font-medium">{formatIDR(discountCost.loyalty)}</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span>Referral / Cashback</span><span className="font-medium">{formatIDR(discountCost.referral)}</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span>Manual Discount</span><span className="font-medium">{formatIDR(discountCost.manual)}</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-primary/10 border border-primary/30 text-base"><span className="font-semibold">Total Cost To Company</span><span className="font-bold text-primary">{formatIDR(discountCost.total)}</span></div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Promo", value: discountCost.promo },
                { name: "Loyalty", value: discountCost.loyalty },
                { name: "Referral", value: discountCost.referral },
                { name: "Manual", value: discountCost.manual },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatIDR(v)} contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* Section 8: Net Revenue */}
      <Section title="Net Revenue (KPI Utama Owner)" icon={TrendingUp}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-sm">
            {[
              ["Gross Revenue", kpi.gross, false],
              ["(-) Promo Cost", -discountCost.promo, false],
              ["(-) Loyalty Cost", -discountCost.loyalty, false],
              ["(-) Referral Cost", -discountCost.referral, false],
              ["(-) Free Service Cost", -netRevenue.freeCost, false],
            ].map(([label, val]: any) => (
              <div key={label} className="flex justify-between p-2 border-b border-border/30">
                <span>{label}</span>
                <span className={val < 0 ? "text-red-400" : ""}>{formatIDR(Math.abs(val))}</span>
              </div>
            ))}
            <div className="flex justify-between p-3 mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-lg">
              <span className="font-semibold">= NET REVENUE</span>
              <span className="font-bold text-emerald-400">{formatIDR(netRevenue.net)}</span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.6} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.05} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatIDR(v)} contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="gross" stroke="hsl(var(--primary))" fill="url(#g1)" />
                <Area type="monotone" dataKey="net" stroke="#10b981" fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* Section 9: Top Insight */}
      <Section title="Top Insight" icon={Activity}>
        <ul className="space-y-2 text-sm">
          {insights.map((s, i) => (
            <li key={i} className="flex gap-2 p-2 rounded-md bg-muted/20"><span className="text-primary">•</span><span>{s}</span></li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

export default FinancialReport;
