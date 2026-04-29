import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Activity, Clock, Hourglass, Star, RefreshCw, ArrowRight,
  CalendarPlus, CreditCard, XCircle, MessageSquare,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import CRMAnalytics from "./CRMAnalytics";
import CustomerActivitySummary from "./CustomerActivitySummary";

interface StatusLog {
  id: string;
  booking_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_at: string;
  duration_from_prev_minutes: number | null;
}

interface BookingLite {
  id: string;
  service_name: string;
  customer_name: string;
  user_id: string;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_id: string | null;
}

const fmtMinutes = (m: number | null) => {
  if (m == null) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
};

const durationTone = (m: number | null) => {
  if (m == null) return "bg-muted text-muted-foreground";
  if (m < 15) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (m <= 60) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-destructive/15 text-destructive";
};

const timeAgo = (iso: string) => {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${Math.floor(diff)} dtk lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
};

const statusLabel = (s: string | null) => {
  if (!s) return "—";
  const map: Record<string, string> = {
    idle: "Menunggu",
    pending: "Menunggu",
    waiting_confirmation: "Menunggu Konfirmasi",
    confirmed: "Dikonfirmasi",
    checked_in: "Check-in",
    in_progress: "Dikerjakan",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };
  return map[s] || s.replace(/_/g, " ");
};

const initials = (name?: string | null) => {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
};

const activityIcon = (type: string) => {
  switch (type) {
    case "booking": return CalendarPlus;
    case "payment": return CreditCard;
    case "cancel_request": return XCircle;
    case "review": return MessageSquare;
    default: return Activity;
  }
};

const CRMDashboard = () => {
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [bookings, setBookings] = useState<Record<string, BookingLite>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activityProfiles, setActivityProfiles] = useState<Record<string, ProfileLite>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [avgRespToday, setAvgRespToday] = useState<number | null>(null);
  const [avgServiceToday, setAvgServiceToday] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [chartData, setChartData] = useState<{ day: string; minutes: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const last7Start = new Date();
    last7Start.setDate(last7Start.getDate() - 6);
    last7Start.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Last 50 logs (for table) + last-7-days logs (for chart, also covers card metrics for today)
    const [{ data: recentLogs }, { data: weekLogs }, { count: pendingC }, { data: reviews }] = await Promise.all([
      (supabase as any)
        .from("booking_status_logs")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(50),
      (supabase as any)
        .from("booking_status_logs")
        .select("to_status,changed_at,duration_from_prev_minutes")
        .gte("changed_at", last7Start.toISOString())
        .order("changed_at", { ascending: true })
        .limit(2000),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "waiting_confirmation"),
      (supabase as any)
        .from("public_reviews")
        .select("rating,created_at")
        .gte("created_at", monthStart.toISOString())
        .limit(1000),
    ]);

    const logRows = (recentLogs as StatusLog[]) || [];
    setLogs(logRows);

    // Hydrate bookings + profiles for table
    const bookingIds = Array.from(new Set(logRows.map((l) => l.booking_id))).filter(Boolean);
    const userIds = Array.from(new Set(logRows.map((l) => l.changed_by).filter(Boolean) as string[]));

    const [{ data: bks }, { data: profs }] = await Promise.all([
      bookingIds.length
        ? supabase.from("bookings").select("id,service_name,customer_name,user_id").in("id", bookingIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from("profiles").select("id,full_name").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const bMap: Record<string, BookingLite> = {};
    (bks || []).forEach((b: any) => { bMap[b.id] = b; });
    setBookings(bMap);
    const pMap: Record<string, ProfileLite> = {};
    (profs || []).forEach((p: any) => { pMap[p.id] = p; });
    setProfiles(pMap);

    setPendingCount(pendingC || 0);

    // KPI: response time today (confirmed -> checked_in)
    // KPI: service time today (checked_in -> completed)
    const todayIso = todayStart.toISOString();
    const respDur: number[] = [];
    const svcDur: number[] = [];
    (weekLogs || []).forEach((l: any) => {
      if (l.changed_at < todayIso) return;
      if (l.to_status === "checked_in" && l.duration_from_prev_minutes != null) respDur.push(l.duration_from_prev_minutes);
      if (l.to_status === "completed" && l.duration_from_prev_minutes != null) svcDur.push(l.duration_from_prev_minutes);
    });
    setAvgRespToday(respDur.length ? Math.round(respDur.reduce((a, b) => a + b, 0) / respDur.length) : null);
    setAvgServiceToday(svcDur.length ? Math.round(svcDur.reduce((a, b) => a + b, 0) / svcDur.length) : null);

    // Avg rating this month
    const ratings = (reviews || []).map((r: any) => r.rating).filter((r: any) => typeof r === "number");
    setAvgRating(ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : null);

    // Chart: last 7 days avg response time (to checked_in)
    const dayBuckets: Record<string, number[]> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(last7Start);
      d.setDate(d.getDate() + i);
      dayBuckets[d.toISOString().slice(0, 10)] = [];
    }
    (weekLogs || []).forEach((l: any) => {
      if (l.to_status !== "checked_in" || l.duration_from_prev_minutes == null) return;
      const key = l.changed_at.slice(0, 10);
      if (dayBuckets[key]) dayBuckets[key].push(l.duration_from_prev_minutes);
    });
    const chart = Object.entries(dayBuckets).map(([day, arr]) => {
      const d = new Date(day);
      const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
      return {
        day: label,
        minutes: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
      };
    });
    setChartData(chart);

    // Activity feed
    const { data: acts } = await supabase
      .from("activity_logs")
      .select("id,type,description,created_at,user_id")
      .in("type", ["booking", "payment", "cancel_request", "review"])
      .order("created_at", { ascending: false })
      .limit(20);
    const actRows = (acts as ActivityRow[]) || [];
    setActivities(actRows);

    const actUserIds = Array.from(new Set(actRows.map((a) => a.user_id).filter(Boolean) as string[]));
    if (actUserIds.length) {
      const { data: actProfs } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", actUserIds);
      const map: Record<string, ProfileLite> = {};
      (actProfs || []).forEach((p: any) => { map[p.id] = p; });
      setActivityProfiles(map);
    } else {
      setActivityProfiles({});
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // Realtime: refresh on new status log
    const ch = supabase
      .channel("crm-status-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_status_logs" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => ([
    {
      label: "Avg. Response Time",
      sub: "Konfirmasi → Check-in (hari ini)",
      value: avgRespToday == null ? "–" : fmtMinutes(avgRespToday),
      icon: Clock,
      tone: "text-blue-500",
    },
    {
      label: "Avg. Service Time",
      sub: "Check-in → Selesai (hari ini)",
      value: avgServiceToday == null ? "–" : fmtMinutes(avgServiceToday),
      icon: Hourglass,
      tone: "text-violet-500",
    },
    {
      label: "Pending Confirmation",
      sub: "Booking menunggu konfirmasi",
      value: String(pendingCount),
      icon: Activity,
      tone: "text-amber-500",
    },
    {
      label: "Customer Satisfaction",
      sub: "Rata-rata rating bulan ini",
      value: avgRating == null ? "–" : `${avgRating} / 5`,
      icon: Star,
      tone: "text-emerald-500",
    },
  ]), [avgRespToday, avgServiceToday, pendingCount, avgRating]);

  return (
    <div className="space-y-4">
      {/* Customer behavior analytics */}
      <CRMAnalytics />

      <div className="pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Performa Operasional
        </h3>
      </div>

      {/* Section A — KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
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

      {/* Section C — Response time chart */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Response Time — 7 Hari Terakhir</CardTitle>
            <p className="text-xs text-muted-foreground">Rata-rata menit dari konfirmasi ke check-in</p>
          </div>
          <button
            onClick={fetchAll}
            className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="currentColor" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => [`${v} min`, "Avg"]}
                />
                <Bar dataKey="minutes" fill="#E53935" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Section B — Status timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Status Timeline</CardTitle>
          <p className="text-xs text-muted-foreground">50 perubahan status terakhir, terbaru di atas</p>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Perubahan</TableHead>
                  <TableHead>Diubah Oleh</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Durasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6"><RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">Belum ada perubahan status</TableCell></TableRow>
                ) : (
                  logs.map((l) => {
                    const b = bookings[l.booking_id];
                    const by = l.changed_by ? profiles[l.changed_by]?.full_name || "Staff" : "Sistem";
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{b?.customer_name || "—"}</TableCell>
                        <TableCell className="text-sm">{b?.service_name || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">{statusLabel(l.from_status)}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{statusLabel(l.to_status)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{by}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{timeAgo(l.changed_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${durationTone(l.duration_from_prev_minutes)} border-0`}>
                            {fmtMinutes(l.duration_from_prev_minutes)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading && logs.length === 0 ? (
              <div className="py-6 flex justify-center"><RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : logs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Belum ada perubahan status</p>
            ) : (
              logs.map((l) => {
                const b = bookings[l.booking_id];
                const by = l.changed_by ? profiles[l.changed_by]?.full_name || "Staff" : "Sistem";
                return (
                  <div key={l.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{b?.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{b?.service_name || "—"}</p>
                      </div>
                      <Badge variant="outline" className={`${durationTone(l.duration_from_prev_minutes)} border-0 shrink-0`}>
                        {fmtMinutes(l.duration_from_prev_minutes)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{statusLabel(l.from_status)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{statusLabel(l.to_status)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                      <span>{by}</span>
                      <span>{timeAgo(l.changed_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section D — Activity feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer Activity</CardTitle>
          <p className="text-xs text-muted-foreground">20 aktivitas customer terakhir</p>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Belum ada aktivitas</p>
          ) : (
            <ul className="divide-y">
              {activities.map((a) => {
                const Icon = activityIcon(a.type);
                const name = a.user_id ? activityProfiles[a.user_id]?.full_name : null;
                return (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {name ? initials(name) : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {name && <span className="font-medium">{name}</span>}
                        {name && " — "}
                        <span className="text-muted-foreground">{a.description}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(a.created_at)}</p>
                    </div>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMDashboard;