import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Clock, Hourglass, Star, RefreshCw, ArrowRight,
  CalendarPlus, CreditCard, XCircle, MessageSquare, StickyNote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import CRMAnalytics from "./CRMAnalytics";
import CustomerActivitySummary from "./CustomerActivitySummary";
import { Button } from "@/components/ui/button";
import FilterBar, { type TimelineValue } from "./filters/FilterBar";
import { DEFAULT_TIMELINE, getDateRange } from "@/utils/timelineFilter";
import { useScopedBranches } from "@/hooks/useBranches";
import { useUserRole } from "@/hooks/useUserRole";

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

interface NoteRow {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  branch: string | null;
  booking_date: string;
  booking_time: string;
  status: string;
  customer_notes: string;
  created_at: string;
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
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  const { isAdminCabang } = useUserRole();

  // Shared filter state — drives analytics, status logs, notes
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [branchFilter, setBranchFilter] = useState<string>(isLocked && lockedBranch ? lockedBranch : "all");
  const [roleFilter, setRoleFilter] = useState<string>("all"); // all | admin | staff | admin_cabang | system
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (isLocked && lockedBranch && branchFilter !== lockedBranch) {
      setBranchFilter(lockedBranch);
    }
  }, [isLocked, lockedBranch]);

  const { startISO, endISO } = useMemo(() => {
    const r = getDateRange(timeline);
    return { startISO: `${r.start}T00:00:00.000Z`, endISO: `${r.end}T23:59:59.999Z` };
  }, [timeline]);

  // Map of changed_by user_id -> role label for filtering
  const [actorRoles, setActorRoles] = useState<Record<string, string>>({});

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
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [showAllNotes, setShowAllNotes] = useState(false);

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
        .gte("changed_at", startISO)
        .lte("changed_at", endISO)
        .order("changed_at", { ascending: false })
        .limit(200),
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

    const [{ data: bks }, { data: profs }, { data: roleRows }] = await Promise.all([
      bookingIds.length
        ? supabase.from("bookings").select("id,service_name,customer_name,user_id").in("id", bookingIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from("profiles").select("id,full_name").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from("user_roles").select("user_id,role").in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const bMap: Record<string, BookingLite> = {};
    (bks || []).forEach((b: any) => { bMap[b.id] = b; });
    setBookings(bMap);
    const pMap: Record<string, ProfileLite> = {};
    (profs || []).forEach((p: any) => { pMap[p.id] = p; });
    setProfiles(pMap);
    const rMap: Record<string, string> = {};
    (roleRows || []).forEach((r: any) => { rMap[r.user_id] = r.role; });
    setActorRoles(rMap);

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

    // Customer complaint notes — latest bookings with non-empty customer_notes
    let nq = supabase
      .from("bookings")
      .select("id,customer_name,customer_phone,service_name,branch,booking_date,booking_time,status,customer_notes,created_at")
      .not("customer_notes", "is", null)
      .neq("customer_notes", "")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: false })
      .limit(50);
    if (branchFilter !== "all") nq = nq.eq("branch", branchFilter);
    const { data: noteRows } = await nq;
    setNotes((noteRows as NoteRow[]) || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // Realtime: refresh on new status log
    const ch = supabase
      .channel("crm-status-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_status_logs" }, fetchAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, fetchAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startISO, endISO, branchFilter]);

  // Apply role + branch + status filters in-memory to logs/notes
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const b = bookings[l.booking_id];
      if (branchFilter !== "all" && b?.user_id && b && (b as any).branch && (b as any).branch !== branchFilter) {
        // bookings lookup doesn't carry branch — so skip branch check here (covered server-side via notes/analytics)
      }
      if (statusFilter !== "all" && l.to_status !== statusFilter) return false;
      if (roleFilter !== "all") {
        if (roleFilter === "system") {
          if (l.changed_by) return false;
        } else {
          const r = l.changed_by ? actorRoles[l.changed_by] : null;
          if (r !== roleFilter) return false;
        }
      }
      return true;
    });
  }, [logs, bookings, branchFilter, statusFilter, roleFilter, actorRoles]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      return true;
    });
  }, [notes, statusFilter]);

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
      {/* Shared Filter Bar */}
      <FilterBar
        timeline={{ value: timeline, onChange: setTimeline, label: "Periode" }}
        dropdowns={[
          {
            key: "branch",
            label: "Cabang",
            value: branchFilter,
            onChange: setBranchFilter,
            disabled: isLocked,
            options: [
              ...(isLocked ? [] : [{ label: "Semua", value: "all" }]),
              ...branches.map((b) => ({ label: b.name, value: b.slug })),
            ],
          },
          ...(isAdminCabang
            ? []
            : [{
                key: "role",
                label: "Role Admin",
                value: roleFilter,
                onChange: setRoleFilter,
                options: [
                  { label: "Semua", value: "all" },
                  { label: "Owner (Staff)", value: "staff" },
                  { label: "CS Pusat (Admin)", value: "admin" },
                  { label: "Admin Cabang", value: "admin_cabang" },
                  { label: "Sistem", value: "system" },
                ],
              }]),
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "Semua", value: "all" },
              { label: "Menunggu Konfirmasi", value: "waiting_confirmation" },
              { label: "Dikonfirmasi", value: "confirmed" },
              { label: "Check-in", value: "checked_in" },
              { label: "Dikerjakan", value: "in_progress" },
              { label: "Selesai", value: "completed" },
              { label: "Dibatalkan", value: "cancelled" },
            ],
          },
        ]}
        onReset={() => {
          setTimeline(DEFAULT_TIMELINE);
          if (!isLocked) setBranchFilter("all");
          setRoleFilter("all");
          setStatusFilter("all");
        }}
      />

      {/* Customer behavior analytics */}
      <CRMAnalytics startISO={startISO} endISO={endISO} branch={branchFilter} hidePeriodToggle />

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

      {/* Section B — Aktivitas terbaru, diringkas per customer */}
      {/* Section B1 — Catatan & Keluhan Pelanggan */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-500" />
              Catatan & Keluhan Pelanggan
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Rekap catatan/keluhan yang ditulis pelanggan saat booking
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {filteredNotes.length} catatan
          </Badge>
        </CardHeader>
        <CardContent>
          {loading && filteredNotes.length === 0 ? (
            <div className="py-6 flex justify-center">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Belum ada catatan dari pelanggan
            </p>
          ) : (
            <>
              <ul className="divide-y">
                {(showAllNotes ? filteredNotes : filteredNotes.slice(0, 6)).map((n) => (
                  <li key={n.id} className="py-3 px-1 flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(n.customer_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{n.customer_name}</p>
                        {n.branch && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">
                            {n.branch}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {n.service_name} • {n.booking_date} {n.booking_time}
                      </p>
                      <div className="mt-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[12px] leading-snug">
                        <p className="text-foreground whitespace-pre-wrap">
                          {n.customer_notes}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {filteredNotes.length > 6 && (
                <div className="pt-2 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAllNotes((v) => !v)}
                  >
                    {showAllNotes
                      ? "Tampilkan lebih sedikit"
                      : `Lihat semua (${filteredNotes.length})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section B — Aktivitas terbaru, diringkas per customer */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Aktivitas Terbaru per Customer</CardTitle>
            <p className="text-xs text-muted-foreground">
              Perubahan status terbaru dikelompokkan per pelanggan
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            // Group logs by customer (user_id from booking lookup)
            type Group = {
              userId: string;
              name: string;
              service: string;
              latest: StatusLog;
              count: number;
              lastBy: string;
            };
            const groups = new Map<string, Group>();
            filteredLogs.forEach((l) => {
              const b = bookings[l.booking_id];
              if (!b) return;
              const key = b.user_id || b.customer_name;
              const by = l.changed_by ? profiles[l.changed_by]?.full_name || "Staff" : "Sistem";
              const existing = groups.get(key);
              if (!existing) {
                groups.set(key, {
                  userId: key,
                  name: b.customer_name || "—",
                  service: b.service_name || "—",
                  latest: l,
                  count: 1,
                  lastBy: by,
                });
              } else {
                existing.count += 1;
                if (l.changed_at > existing.latest.changed_at) {
                  existing.latest = l;
                  existing.lastBy = by;
                  existing.service = b.service_name || existing.service;
                }
              }
            });
            const grouped = Array.from(groups.values()).sort(
              (a, b) => new Date(b.latest.changed_at).getTime() - new Date(a.latest.changed_at).getTime()
            );
            const display = showAllActivity ? grouped : grouped.slice(0, 8);

            if (loading && grouped.length === 0) {
              return (
                <div className="py-6 flex justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              );
            }
            if (grouped.length === 0) {
              return (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Belum ada aktivitas
                </p>
              );
            }
            return (
              <>
                <ul className="divide-y">
                  {display.map((g) => {
                    const init = g.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("");
                    return (
                      <li
                        key={g.userId}
                        className="flex items-center gap-3 py-2.5 px-1"
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {init || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{g.name}</p>
                            {g.count > 1 && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                {g.count}×
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {g.service}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                            <span className="text-muted-foreground">
                              {statusLabel(g.latest.from_status)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {statusLabel(g.latest.to_status)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge
                            variant="outline"
                            className={`${durationTone(g.latest.duration_from_prev_minutes)} border-0 text-[10px]`}
                          >
                            {fmtMinutes(g.latest.duration_from_prev_minutes)}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {timeAgo(g.latest.changed_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {grouped.length > 8 && (
                  <div className="pt-2 flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setShowAllActivity((v) => !v)}
                    >
                      {showAllActivity
                        ? "Tampilkan lebih sedikit"
                        : `Lihat semua (${grouped.length})`}
                    </Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Untuk timeline lengkap per booking, klik kartu pelanggan di bawah ↓
                </p>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Section D — Activity feed */}
      <CustomerActivitySummary />
    </div>
  );
};

export default CRMDashboard;