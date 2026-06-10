import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, Users, CalendarCheck, TrendingUp, Globe, Smartphone,
  Search, MapPin, Lightbulb, BarChart3, AlertCircle, Wallet, Clock, Building2,
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
  const [ga, setGa] = useState<any>(null);
  const [gaError, setGaError] = useState<string | null>(null);
  const [gaLoading, setGaLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const since = sinceISO(range);

      const [profRes, bookRes, doneRes, svcRes, cityRes] = await Promise.all([
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

      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [range]);

  // GA4 fetch
  useEffect(() => {
    let active = true;
    setGaLoading(true);
    setGaError(null);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ga4-analytics", {
          body: { range },
        });
        if (!active) return;
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setGa(data);
      } catch (e: any) {
        if (!active) return;
        setGaError(e?.message || "Gagal memuat GA4");
      } finally {
        if (active) setGaLoading(false);
      }
    })();
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
          Data dari database internal · Traffic visitor menyusul setelah GA4 dipasang
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
            label="Visitor (GA4)"
            value={gaLoading ? "…" : ga ? fmt(ga.totals?.users || 0) : "—"}
            hint={gaError ? "GA4 error — lihat di bawah" : ga ? `${fmt(ga.totals?.sessions || 0)} sesi` : "Memuat…"}
          />
        </div>
      </section>

      {/* GA4 — Web Analytics */}
      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          Web Analytics (GA4) · {RANGE_LABEL[range]}
        </h3>

        {gaError ? (
          <Card className="bg-amber-500/5 border-amber-500/40">
            <CardContent className="p-4 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <div>
                <div className="font-medium text-amber-700 dark:text-amber-400">GA4 belum siap</div>
                <div className="text-muted-foreground text-xs mt-1 break-words">{gaError}</div>
                <ul className="text-xs text-muted-foreground mt-2 list-disc pl-4 space-y-0.5">
                  <li>Pastikan <strong>GA4_PROPERTY_ID</strong> adalah angka (Admin → Property Settings), bukan Measurement ID (G-…).</li>
                  <li>Pastikan service account email sudah ditambahkan sebagai <em>Viewer/Analyst</em> di Property GA4.</li>
                  <li>GA4 butuh ~24 jam setelah pemasangan untuk mulai menampilkan data.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={Globe}      label="Pageviews"     value={gaLoading ? "…" : fmt(ga?.totals?.pageViews || 0)} />
              <KpiCard icon={Activity}   label="Sesi"          value={gaLoading ? "…" : fmt(ga?.totals?.sessions || 0)} />
              <KpiCard icon={TrendingUp} label="Bounce Rate"   value={gaLoading ? "…" : pct(ga?.totals?.bounceRate || 0)} />
              <KpiCard icon={Smartphone} label="Avg. Durasi"   value={gaLoading ? "…" : dur(ga?.totals?.avgSessionDuration || 0)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <ListCard
                icon={Globe}
                title="Traffic Sources"
                loading={gaLoading}
                rows={(ga?.sources || []).map((r: any) => ({ label: r.key || "(direct)", value: fmt(r.value) }))}
              />
              <ListCard
                icon={Smartphone}
                title="Device"
                loading={gaLoading}
                rows={(ga?.devices || []).map((r: any) => ({ label: r.key, value: fmt(r.value) }))}
              />
              <ListCard
                icon={BarChart3}
                title="Top Pages"
                loading={gaLoading}
                rows={(ga?.topPages || []).map((r: any) => ({ label: r.key, value: fmt(r.value) }))}
              />
            </div>
          </>
        )}
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
            Setelah GA4 + event tracker aktif, panel ini akan otomatis menyajikan ringkasan
            mingguan: tren traffic, perubahan konversi, layanan paling dicari, dan rekomendasi
            aksi berbasis Gemini.
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