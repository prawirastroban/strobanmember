// SPK Intelligence Suite — Analytics
// Consumes existing spk_events + spk_analytics_daily. Pure derivations, no writes.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  aggregateDurations,
  durationsFor,
  formatDuration,
  productivityByActor,
  type RawEvent,
} from "@/lib/spk/operationalAnalytics";
import { eventToStage } from "@/lib/spk/eventLabels";

type DailyRow = { bucket_date: string; metric_code: string; metric_value: number };

export default function SPKAnalyticsPage() {
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const sinceDate = since.slice(0, 10);
      const [d, e] = await Promise.all([
        supabase
          .from("spk_analytics_daily")
          .select("bucket_date, metric_code, metric_value")
          .gte("bucket_date", sinceDate),
        supabase
          .from("spk_events")
          .select("spk_id, event_type, occurred_at, payload, actor_user_id, actor_role")
          .gte("occurred_at", since)
          .order("occurred_at", { ascending: true })
          .limit(5000),
      ]);
      setDaily((d.data ?? []) as DailyRow[]);
      setEvents((e.data ?? []) as RawEvent[]);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const r of daily) t[r.metric_code] = (t[r.metric_code] ?? 0) + Number(r.metric_value);
    return t;
  }, [daily]);

  const durations = useMemo(() => {
    // Group events by spk_id → compute per-SPK durations → aggregate.
    const bySpk = new Map<string, RawEvent[]>();
    for (const e of events) {
      const arr = bySpk.get(e.spk_id) ?? [];
      arr.push(e);
      bySpk.set(e.spk_id, arr);
    }
    const perSpk = [...bySpk.values()].map(durationsFor);
    return aggregateDurations(perSpk);
  }, [events]);

  const mechanicProductivity = useMemo(
    () => productivityByActor(events, "work_completed").slice(0, 5),
    [events],
  );
  const qcProductivity = useMemo(
    () => productivityByActor(events, "qc_approved").slice(0, 5),
    [events],
  );

  // Daily operational summary (last 7 days), grouped by bucket_date.
  const dailySummary = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const r of daily) {
      const row = map.get(r.bucket_date) ?? {};
      row[r.metric_code] = (row[r.metric_code] ?? 0) + Number(r.metric_value);
      map.set(r.bucket_date, row);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
  }, [daily]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
      </div>
    );
  }

  const kpis = [
    { code: "spk_created", label: "SPK Baru" },
    { code: "spk_closed", label: "SPK Selesai" },
    { code: "spk_cancelled", label: "SPK Dibatalkan" },
    { code: "approval_requested", label: "Approval Diminta" },
  ];

  const durationCards = [
    { key: "waitingMs", label: "Waiting Time" },
    { key: "inspectionMs", label: "Inspection Duration" },
    { key: "repairMs", label: "Repair Duration" },
    { key: "qcMs", label: "QC Duration" },
    { key: "leadTimeMs", label: "Lead Time" },
    { key: "completionMs", label: "Completion Time" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">KPI 30 hari</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <Card key={k.code}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{totals[k.code] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Durations (Rata-rata)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {durationCards.map((c) => {
            const d = durations[c.key];
            return (
              <Card key={c.key}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold tabular-nums mt-1">
                    {formatDuration(d?.avg ?? null)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {d?.count ?? 0} sampel
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mechanic Productivity</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {mechanicProductivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada job selesai.</p>
            ) : (
              mechanicProductivity.map((r) => (
                <div key={r.actor_user_id} className="flex justify-between text-sm">
                  <span className="truncate">{r.actor_user_id.slice(0, 8)}…</span>
                  <span className="font-semibold tabular-nums">{r.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">QC Productivity</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {qcProductivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada QC approved.</p>
            ) : (
              qcProductivity.map((r) => (
                <div key={r.actor_user_id} className="flex justify-between text-sm">
                  <span className="truncate">{r.actor_user_id.slice(0, 8)}…</span>
                  <span className="font-semibold tabular-nums">{r.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Operational Summary</CardTitle></CardHeader>
        <CardContent>
          {dailySummary.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada data harian.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-3">Tanggal</th>
                    <th className="py-1 pr-3">Created</th>
                    <th className="py-1 pr-3">Closed</th>
                    <th className="py-1 pr-3">Cancelled</th>
                    <th className="py-1 pr-3">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummary.map(([date, row]) => (
                    <tr key={date} className="border-t border-border/40">
                      <td className="py-1 pr-3 tabular-nums">{date}</td>
                      <td className="py-1 pr-3 tabular-nums">{row.spk_created ?? 0}</td>
                      <td className="py-1 pr-3 tabular-nums">{row.spk_closed ?? 0}</td>
                      <td className="py-1 pr-3 tabular-nums">{row.spk_cancelled ?? 0}</td>
                      <td className="py-1 pr-3 tabular-nums">{row.approval_requested ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// silence unused import when eventToStage isn't referenced directly:
void eventToStage;