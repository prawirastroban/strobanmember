// SPK Intelligence Suite — Analytics & Reports (merged)
// Menggabungkan KPI/Analytics + Reports Export dalam satu halaman. Konsumsi
// spk_events + spk_analytics_daily + spk_orders. Zero recomputation di luar
// pure derivations di operationalAnalytics.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import {
  aggregateDurations, durationsFor, formatDuration, productivityByActor,
  type RawEvent,
} from "@/lib/spk/operationalAnalytics";

type Daily = { bucket_date: string; metric_code: string; metric_value: number };

function downloadCSV(name: string, header: string[], rows: (string | number)[][]) {
  const csv = [header.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function SPKReportsPage() {
  const [daily, setDaily] = useState<Daily[]>([]);
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [orders, setOrders] = useState<Array<{ id: string; branch_id: string | null; status: string; closed_at: string | null; data: unknown }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const sinceDate = since.slice(0, 10);
      const [d, e, o] = await Promise.all([
        supabase.from("spk_analytics_daily").select("*").gte("bucket_date", sinceDate),
        supabase.from("spk_events")
          .select("spk_id, event_type, occurred_at, payload, actor_user_id, actor_role")
          .gte("occurred_at", since).order("occurred_at", { ascending: true }).limit(10000),
        supabase.from("spk_orders").select("id, branch_id, status, closed_at, data").gte("created_at", since).limit(5000),
      ]);
      setDaily((d.data ?? []) as Daily[]);
      setEvents((e.data ?? []) as RawEvent[]);
      setOrders((o.data ?? []) as never);
      setLoading(false);
    })();
  }, []);

  // KPI totals (30d subset of the 90d window — filtered client-side)
  const kpiTotals = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const t: Record<string, number> = {};
    for (const r of daily) {
      if (r.bucket_date < cutoff) continue;
      t[r.metric_code] = (t[r.metric_code] ?? 0) + Number(r.metric_value);
    }
    return t;
  }, [daily]);

  const perSpk = useMemo(() => {
    const bySpk = new Map<string, RawEvent[]>();
    for (const e of events) {
      const arr = bySpk.get(e.spk_id) ?? []; arr.push(e); bySpk.set(e.spk_id, arr);
    }
    return [...bySpk.entries()].map(([spk_id, evts]) => ({ spk_id, dur: durationsFor(evts) }));
  }, [events]);

  const totals = useMemo(() => aggregateDurations(perSpk.map((r) => r.dur)), [perSpk]);

  const mechanicProductivity = useMemo(
    () => productivityByActor(events, "work_completed").slice(0, 5),
    [events],
  );
  const qcProductivity = useMemo(
    () => productivityByActor(events, "qc_approved").slice(0, 5),
    [events],
  );

  // Daily summary (last 7 days) grouped by bucket_date.
  const dailySummary = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const r of daily) {
      const row = map.get(r.bucket_date) ?? {};
      row[r.metric_code] = (row[r.metric_code] ?? 0) + Number(r.metric_value);
      map.set(r.bucket_date, row);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
  }, [daily]);

  const kpis = [
    { code: "spk_created", label: "SPK Baru (30d)" },
    { code: "spk_closed", label: "SPK Selesai (30d)" },
    { code: "spk_cancelled", label: "SPK Dibatalkan (30d)" },
    { code: "approval_requested", label: "Approval Diminta (30d)" },
  ];

  const durationCards = [
    { key: "waitingMs", label: "Waiting Time" },
    { key: "inspectionMs", label: "Inspection Duration" },
    { key: "repairMs", label: "Repair Duration" },
    { key: "qcMs", label: "QC Duration" },
    { key: "leadTimeMs", label: "Lead Time" },
    { key: "completionMs", label: "Completion Time" },
  ] as const;

  const reports = [
    {
      key: "operational",
      title: "Operational Report",
      desc: "Ringkasan metrik harian dari Analytics.",
      onExport: () =>
        downloadCSV("spk-operational",
          ["bucket_date", "metric_code", "metric_value"],
          daily.map((r) => [r.bucket_date, r.metric_code, r.metric_value])),
    },
    {
      key: "mechanic",
      title: "Mechanic Performance",
      desc: "Job selesai per mekanik (event work_completed).",
      onExport: () =>
        downloadCSV("spk-mechanic",
          ["actor_user_id", "completed_jobs"],
          productivityByActor(events, "work_completed").map((r) => [r.actor_user_id, r.count])),
    },
    {
      key: "qc",
      title: "QC Performance",
      desc: "QC approved per QC (event qc_passed).",
      onExport: () =>
        downloadCSV("spk-qc",
          ["actor_user_id", "qc_approved"],
          productivityByActor(events, "qc_approved").map((r) => [r.actor_user_id, r.count])),
    },
    {
      key: "leadtime",
      title: "Lead Time",
      desc: "Lead time per SPK (created → closed).",
      onExport: () =>
        downloadCSV("spk-leadtime",
          ["spk_id", "lead_time_ms", "lead_time"],
          perSpk.map((r) => [r.spk_id, r.dur.leadTimeMs ?? "", formatDuration(r.dur.leadTimeMs)])),
    },
    {
      key: "waiting",
      title: "Waiting Time",
      desc: "Antrian awal (created → repair_started).",
      onExport: () =>
        downloadCSV("spk-waiting",
          ["spk_id", "waiting_ms", "waiting"],
          perSpk.map((r) => [r.spk_id, r.dur.waitingMs ?? "", formatDuration(r.dur.waitingMs)])),
    },
    {
      key: "branch",
      title: "Branch Performance",
      desc: "Volume SPK per cabang.",
      onExport: () => {
        const map = new Map<string, { total: number; closed: number }>();
        for (const o of orders) {
          const k = o.branch_id ?? "-";
          const v = map.get(k) ?? { total: 0, closed: 0 };
          v.total++;
          if (o.status === "closed") v.closed++;
          map.set(k, v);
        }
        downloadCSV("spk-branch",
          ["branch_id", "total_spk", "closed_spk"],
          [...map.entries()].map(([id, v]) => [id, v.total, v.closed]));
      },
    },
    {
      key: "service_category",
      title: "Service Category Summary",
      desc: "Kategori layanan dari spk_orders.data.service_category.",
      onExport: () => {
        const map = new Map<string, number>();
        for (const o of orders) {
          const cat = String((o.data as Record<string, unknown> | null)?.service_category ?? "Uncategorized");
          map.set(cat, (map.get(cat) ?? 0) + 1);
        }
        downloadCSV("spk-service-category",
          ["category", "count"],
          [...map.entries()]);
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── SECTION 1. KPI 30 hari ── */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">KPI 30 Hari</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <Card key={k.code}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{kpiTotals[k.code] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── SECTION 2. Durations (Rata-rata) ── */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Durations (Rata-rata 90 Hari)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {durationCards.map((c) => {
            const d = totals[c.key];
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
      </section>

      {/* ── SECTION 3. Productivity ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      </section>

      {/* ── SECTION 4. Daily Operational Summary ── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Operational Summary (7 hari terakhir)</CardTitle></CardHeader>
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

      {/* ── SECTION 5. Ringkasan Durasi 90d ── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ringkasan 90 Hari</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Avg Waiting", v: totals.waitingMs?.avg },
            { label: "Avg Repair",  v: totals.repairMs?.avg },
            { label: "Avg QC",      v: totals.qcMs?.avg },
            { label: "Avg Lead",    v: totals.leadTimeMs?.avg },
          ].map((k) => (
            <div key={k.label} className="rounded-md border p-3">
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold tabular-nums">{formatDuration(k.v ?? null)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── SECTION 6. Laporan & Export ── */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Laporan & Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card key={r.key}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Button size="sm" onClick={r.onExport} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                CSV
              </Button>
            </CardContent>
          </Card>
        ))}
        </div>
      </section>
    </div>
  );
}