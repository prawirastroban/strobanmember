import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, Users, CalendarCheck, TrendingUp, Globe, Smartphone,
  Search, MapPin, Lightbulb, BarChart3, AlertCircle, Wallet, Clock, Building2,
  ExternalLink,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Cell, PieChart, Pie, Legend,
} from "recharts";

type Range = "today" | "7d" | "30d";

const RANGE_LABEL: Record<Range, string> = {
  today: "Hari Ini",
  "7d": "7 Hari",
  "30d": "30 Hari",
};

function sinceISO(range: Range) {
  const d = new Date();
  if (range === "today") d.setHours(0, 0, 0, 0);
  else if (range === "7d") d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
}

const KpiCard = ({
  icon: Icon, label, value, hint, tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  tone?: "primary" | "muted";
}) => (
  <Card className="bg-card/60 backdrop-blur-xl border-border/60 hover:scale-[1.02] hover:shadow-[0_0_18px_hsl(var(--primary)/0.18)] transition-all duration-200">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${
          tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </CardContent>
  </Card>
);

const NeedsIntegrationCard = ({
  icon: Icon, title, sources,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; sources: string;
}) => (
  <Card className="bg-card/40 backdrop-blur-xl border-dashed border-border/60">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
        <span>Belum tersedia — butuh integrasi <strong className="text-foreground/80">{sources}</strong>.</span>
      </div>
    </CardContent>
  </Card>
);

const ListCard = ({
  icon: Icon, title, rows, loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  rows: { label: string; value: string }[];
  loading?: boolean;
}) => (
  <Card className="bg-card/60 backdrop-blur-xl border-border/60">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Belum ada data.</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="flex items-center gap-3 text-sm">
              <span className="h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 truncate">{r.label}</span>
              <span className="font-semibold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export default function WebAnalyticsDashboard() {
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);
  const [newUsers, setNewUsers] = useState(0);
  const [bookings, setBookings] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [topServices, setTopServices] = useState<{ name: string; count: number }[]>([]);
  const [topCities, setTopCities] = useState<{ city: string; count: number }[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [revenuePaid, setRevenuePaid] = useState(0);
  const [trend, setTrend] = useState<{ date: string; bookings: number; revenue: number }[]>([]);
  const [statusFunnel, setStatusFunnel] = useState<{ name: string; value: number }[]>([]);
  const [topBranches, setTopBranches] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: string; count: number }[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const since = sinceISO(range);

      const [profRes, bookRes, doneRes, svcRes, cityRes, allBookRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("bookings").select("id", { count: "exact", head: true })
          .eq("status", "completed").gte("created_at", since),
        supabase.from("bookings")
          .select("service_id, services(name)")
          .gte("created_at", since)
          .not("service_id", "is", null)
          .limit(1000),
        supabase.from("bookings")
          .select("city")
          .gte("created_at", since)
          .not("city", "is", null)
          .limit(2000),
        supabase.from("bookings")
          .select("created_at, booking_time, service_price, status, payment_status, branch")
          .gte("created_at", since)
          .limit(5000),
      ]);

      if (!active) return;
      setNewUsers(profRes.count || 0);
      setBookings(bookRes.count || 0);
      setCompleted(doneRes.count || 0);

      const svcMap = new Map<string, number>();
      (svcRes.data || []).forEach((r: any) => {
        const n = r.services?.name; if (!n) return;
        svcMap.set(n, (svcMap.get(n) || 0) + 1);
      });
      setTopServices([...svcMap.entries()].map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5));

      const cityMap = new Map<string, number>();
      (cityRes.data || []).forEach((r: any) => {
        const c = (r.city || "").trim(); if (!c) return;
        cityMap.set(c, (cityMap.get(c) || 0) + 1);
      });
      setTopCities([...cityMap.entries()].map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5));

      // === Revenue, trend, funnel, branches, peak hours ===
      const rows = (allBookRes.data || []) as any[];
      let rev = 0, revP = 0;
      const dayMap = new Map<string, { bookings: number; revenue: number }>();
      const statusMap = new Map<string, number>();
      const branchMap = new Map<string, { count: number; revenue: number }>();
      const hourMap = new Map<number, number>();

      rows.forEach((b) => {
        const price = Number(b.service_price || 0);
        rev += price;
        if (b.payment_status === "paid") revP += price;

        const d = new Date(b.created_at);
        const key = d.toISOString().slice(0, 10);
        const cur = dayMap.get(key) || { bookings: 0, revenue: 0 };
        cur.bookings += 1; cur.revenue += price;
        dayMap.set(key, cur);

        statusMap.set(b.status || "unknown", (statusMap.get(b.status || "unknown") || 0) + 1);

        const br = (b.branch || "Tidak diset").trim();
        const bc = branchMap.get(br) || { count: 0, revenue: 0 };
        bc.count += 1; bc.revenue += price;
        branchMap.set(br, bc);

        const h = parseInt((b.booking_time || "00:00").split(":")[0], 10);
        if (!isNaN(h)) hourMap.set(h, (hourMap.get(h) || 0) + 1);
      });

      setRevenue(rev);
      setRevenuePaid(revP);

      // Fill missing days in trend
      const days: { date: string; bookings: number; revenue: number }[] = [];
      const totalDays = range === "today" ? 1 : range === "7d" ? 7 : 30;
      for (let i = totalDays - 1; i >= 0; i--) {
        const dd = new Date();
        dd.setDate(dd.getDate() - i);
        const k = dd.toISOString().slice(0, 10);
        const v = dayMap.get(k) || { bookings: 0, revenue: 0 };
        days.push({ date: k.slice(5), ...v });
      }
      setTrend(days);

      const STATUS_ORDER = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
      setStatusFunnel(
        STATUS_ORDER
          .filter((s) => statusMap.has(s))
          .map((s) => ({ name: s, value: statusMap.get(s) || 0 }))
          .concat(
            [...statusMap.entries()]
              .filter(([k]) => !STATUS_ORDER.includes(k))
              .map(([name, value]) => ({ name, value }))
          )
      );

      setTopBranches(
        [...branchMap.entries()]
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      const hours: { hour: string; count: number }[] = [];
      for (let h = 7; h <= 20; h++) {
        hours.push({ hour: `${String(h).padStart(2, "0")}:00`, count: hourMap.get(h) || 0 });
      }
      setPeakHours(hours);

      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [range]);

  const conversion = newUsers > 0 ? ((bookings / newUsers) * 100).toFixed(1) : "—";

  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const dur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}m ${sec}s`;
  };
  const rp = (n: number) => {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n.toFixed(0)}`;
  };
  const STATUS_COLOR: Record<string, string> = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    in_progress: "#8b5cf6",
    completed: "#10b981",
    cancelled: "#ef4444",
    unknown: "#94a3b8",
  };

  return (
    <div className="space-y-6">
      {/* Range Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl p-1">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                range === r
                  ? "bg-[hsl(0_95%_55%)] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          Data internal Supabase · Traffic visitor anonim dipantau di Google Analytics
        </div>
      </div>

      {/* KPI Strip (data internal) */}
      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          KPI Utama · {RANGE_LABEL[range]}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Users}         label="User Baru"          value={loading ? "…" : String(newUsers)} hint="Registrasi baru" />
          <KpiCard icon={CalendarCheck} label="Total Booking"      value={loading ? "…" : String(bookings)} hint={`${completed} selesai`} />
          <KpiCard icon={TrendingUp}    label="Booking / User"     value={loading ? "…" : (newUsers > 0 ? conversion + "%" : "—")} hint="Proxy konversi (sementara)" />
          <KpiCard
            icon={Activity}
            label="User Selesai"
            value={loading ? "…" : String(completed)}
            hint={bookings > 0 ? `${((completed / bookings) * 100).toFixed(0)}% completion` : "—"}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Wallet}      label="Estimasi Revenue" value={loading ? "…" : rp(revenue)}     hint="Semua booking masuk" />
          <KpiCard icon={Wallet}      label="Revenue Terbayar" value={loading ? "…" : rp(revenuePaid)} hint={revenue > 0 ? `${((revenuePaid/revenue)*100).toFixed(0)}% terbayar` : "—"} />
          <KpiCard icon={CalendarCheck} label="Selesai"          value={loading ? "…" : String(completed)}                                hint={bookings > 0 ? `${((completed/bookings)*100).toFixed(0)}% completion` : "—"} />
          <KpiCard icon={TrendingUp}  label="Avg Ticket"       value={loading ? "…" : rp(bookings > 0 ? revenue / bookings : 0)}        hint="Rata-rata per booking" />
        </div>
      </section>

      {/* Trend chart */}
      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          Tren Harian · {RANGE_LABEL[range]}
        </h3>
        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardContent className="p-4">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, n: string) => n === "revenue" ? rp(Number(v)) : v}
                  />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" fill="url(#gBookings)" strokeWidth={2} name="Booking" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Funnel + Peak Hours + Branches */}
      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          Operasional · {RANGE_LABEL[range]}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="bg-card/60 backdrop-blur-xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Status Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusFunnel} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {statusFunnel.map((s) => (
                        <Cell key={s.name} fill={STATUS_COLOR[s.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Jam Sibuk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Top Cabang
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Memuat…</div>
              ) : topBranches.length === 0 ? (
                <div className="text-sm text-muted-foreground">Belum ada data.</div>
              ) : (
                <ul className="space-y-2">
                  {topBranches.map((b, i) => (
                    <li key={b.name} className="flex items-center gap-3 text-sm">
                      <span className="h-6 w-6 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{b.name}</div>
                        <div className="text-[10px] text-muted-foreground">{rp(b.revenue)}</div>
                      </div>
                      <span className="font-semibold tabular-nums">{b.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Web Analytics — link out to GA4 (no service account required) */}
      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          Visitor Website (Google Analytics)
        </h3>
        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <Globe className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">Traffic, sumber, device, &amp; bounce rate</div>
              <p className="text-xs text-muted-foreground mt-1">
                Data visitor anonim website dipantau langsung di Google Analytics
                (<code>G-R1H7RQCXJQ</code>). Setiap perpindahan halaman SPA dilacak otomatis
                setelah pengunjung menerima cookie.
              </p>
              <a
                href="https://analytics.google.com/analytics/web/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary hover:underline"
              >
                Buka Google Analytics <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Top services (data internal) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Top Booked Services · {RANGE_LABEL[range]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Memuat…</div>
            ) : topServices.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada booking pada periode ini.</div>
            ) : (
              <ul className="space-y-2">
                {topServices.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{s.name}</span>
                    <span className="text-sm font-semibold tabular-nums">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Top Cities · {RANGE_LABEL[range]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Memuat…</div>
            ) : topCities.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada data kota. Pastikan kolom <code>city</code> terisi saat booking.</div>
            ) : (
              <ul className="space-y-2">
                {topCities.map((c, i) => (
                  <li key={c.city} className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{c.city}</span>
                    <span className="text-sm font-semibold tabular-nums">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insight placeholder */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insight & Rekomendasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Panel ini akan otomatis menyajikan ringkasan mingguan berbasis data internal:
            tren booking, perubahan konversi, layanan paling dicari, dan rekomendasi aksi
            berbasis Gemini.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
            <li>Contoh: <em>Traffic +12% minggu ini · mobile 89% · pencarian "spooring" +25%</em></li>
            <li>Contoh: <em>Conversion -4% — periksa drop-off di step <strong>Pilih Slot</strong></em></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}