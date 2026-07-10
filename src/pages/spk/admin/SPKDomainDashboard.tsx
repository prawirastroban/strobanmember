// SPK Domain Dashboard — Intelligence Suite
// Reads AnalyticsService + spk_orders directly (no recomputation).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, ListChecks, Plus, Workflow, Zap, Settings2, BarChart3, FileBarChart, Wrench,
  Activity, HeartPulse, BellRing,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { slaLevel } from "@/lib/spk/operationalAnalytics";

interface DailyRow { metric_code: string; metric_value: number }
interface OrderRow {
  id: string; spk_number: string; status: string; priority: string;
  branch_id: string | null; created_by: string | null; created_at: string;
  current_owner_user_id: string | null; closed_at: string | null;
}

const TILES: { label: string; url: string; icon: React.ElementType; desc: string }[] = [
  { label: "Queue",             url: "/spk",                              icon: ClipboardList, desc: "Antrian SPK hari ini" },
  { label: "New SPK",           url: "/dashboard/spk/new",                icon: Plus,          desc: "Buat SPK baru" },
  { label: "All SPK",           url: "/dashboard/spk/all",                icon: ListChecks,    desc: "Semua SPK dengan filter" },
  { label: "Template Builder",  url: "/dashboard/spk/templates",          icon: Wrench,        desc: "Skema form SPK" },
  { label: "Workflow",          url: "/dashboard/spk/workflow",           icon: Workflow,      desc: "State transitions" },
  { label: "Automation",        url: "/dashboard/spk/automation",         icon: Zap,           desc: "Aksi otomatis" },
  { label: "Configuration",     url: "/dashboard/spk/configuration",      icon: Settings2,     desc: "Role, approval, numbering" },
  { label: "Analytics",         url: "/dashboard/spk/analytics",          icon: BarChart3,     desc: "KPI operasional" },
  { label: "Reports",           url: "/dashboard/spk/reports",            icon: FileBarChart,  desc: "Laporan SPK" },
  { label: "Vehicle Health",    url: "/dashboard/spk/vehicle-health",     icon: HeartPulse,    desc: "Interpretasi kondisi kendaraan" },
  { label: "Service Reminder",  url: "/dashboard/spk/reminders",          icon: BellRing,      desc: "Pengingat servis dari SPK" },
];

export default function SPKDomainDashboard() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [d, o] = await Promise.all([
        supabase
          .from("spk_analytics_daily")
          .select("metric_code, metric_value")
          .eq("bucket_date", today),
        supabase
          .from("spk_orders")
          .select("id, spk_number, status, priority, branch_id, created_by, created_at, current_owner_user_id, closed_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      const agg: Record<string, number> = {};
      for (const row of (d.data ?? []) as DailyRow[]) {
        agg[row.metric_code] = (agg[row.metric_code] ?? 0) + Number(row.metric_value);
      }
      setMetrics(agg);
      setOrders((o.data ?? []) as OrderRow[]);
    })();
  }, []);

  const derived = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isToday = (iso: string | null) => !!iso && iso.slice(0, 10) === todayStr;
    const OPEN = new Set(["draft","awaiting_customer_approval","approved","assigned","in_progress","work_completed","qc_pending","invoice_issued"]);

    const todayQueue = orders.filter((o) => isToday(o.created_at)).length;
    const active = orders.filter((o) => OPEN.has(o.status)).length;
    const waitingQc = orders.filter((o) => o.status === "qc_pending").length;
    const completedToday = orders.filter((o) => isToday(o.closed_at) && o.status === "closed").length;

    const mechanicLoad = new Map<string, number>();
    const branchLoad = new Map<string, number>();
    for (const o of orders) {
      if (!OPEN.has(o.status)) continue;
      if (o.current_owner_user_id) {
        mechanicLoad.set(o.current_owner_user_id, (mechanicLoad.get(o.current_owner_user_id) ?? 0) + 1);
      }
      if (o.branch_id) {
        branchLoad.set(o.branch_id, (branchLoad.get(o.branch_id) ?? 0) + 1);
      }
    }

    // SLA — count breaches among open orders older than 24h.
    let slaOk = 0, slaWarn = 0, slaBreach = 0;
    const now = Date.now();
    for (const o of orders) {
      if (!OPEN.has(o.status)) continue;
      const age = now - new Date(o.created_at).getTime();
      const s = slaLevel(age, 24);
      if (s === "ok") slaOk++;
      else if (s === "warn") slaWarn++;
      else if (s === "breach") slaBreach++;
    }

    return {
      todayQueue, active, waitingQc, completedToday,
      mechanicLoad: [...mechanicLoad.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),
      branchLoad: [...branchLoad.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),
      slaOk, slaWarn, slaBreach,
    };
  }, [orders]);

  const kpis = [
    { label: "Today's Queue", value: derived.todayQueue, icon: ClipboardList },
    { label: "Active SPK", value: derived.active, icon: Activity },
    { label: "Waiting QC", value: derived.waitingQc, icon: Workflow },
    { label: "Completed Today", value: derived.completedToday, icon: ListChecks },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <k.icon className="h-4 w-4 text-primary/70" />
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">SLA Monitor (24h)</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">On Track</p>
              <p className="text-xl font-bold tabular-nums text-emerald-500">{derived.slaOk}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">Warning</p>
              <p className="text-xl font-bold tabular-nums text-amber-500">{derived.slaWarn}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">Breach</p>
              <p className="text-xl font-bold tabular-nums text-destructive">{derived.slaBreach}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mechanic Load</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {derived.mechanicLoad.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada SPK aktif.</p>
            ) : derived.mechanicLoad.map(([id, n]) => (
              <div key={id} className="flex justify-between text-sm">
                <span className="truncate">{id.slice(0,8)}…</span>
                <Badge variant="outline" className="tabular-nums">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Branch Load</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {derived.branchLoad.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada SPK aktif.</p>
            ) : derived.branchLoad.map(([id, n]) => (
              <div key={id} className="flex justify-between text-sm">
                <span className="truncate">{id.slice(0,8)}…</span>
                <Badge variant="outline" className="tabular-nums">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Operational KPI (hari ini)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { code: "spk_created",  label: "Created" },
            { code: "spk_closed",   label: "Closed" },
            { code: "spk_cancelled", label: "Cancelled" },
            { code: "approval_requested", label: "Approval Req." },
          ].map((k) => (
            <Card key={k.code}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold tabular-nums mt-1">{metrics[k.code] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Menu SPK / Work Order</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TILES.map((t) => (
            <Link key={t.url} to={t.url}>
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <t.icon className="h-4 w-4 mr-2 text-primary shrink-0" />
                <span className="flex flex-col items-start">
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground">{t.desc}</span>
                </span>
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}