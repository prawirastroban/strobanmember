// SPK Domain Dashboard — reads AnalyticsService (no recomputation).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, ListChecks, Plus, Workflow, Zap, Settings2, BarChart3, FileBarChart, Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DailyRow { metric_code: string; metric_value: number }

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
];

export default function SPKDomainDashboard() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("spk_analytics_daily")
        .select("metric_code, metric_value")
        .eq("bucket_date", today);
      const agg: Record<string, number> = {};
      for (const row of (data ?? []) as DailyRow[]) {
        agg[row.metric_code] = (agg[row.metric_code] ?? 0) + Number(row.metric_value);
      }
      setMetrics(agg);
    })();
  }, []);

  const kpis = [
    { code: "spk_created",  label: "SPK Baru Hari Ini" },
    { code: "spk_closed",   label: "SPK Selesai" },
    { code: "spk_cancelled", label: "SPK Dibatalkan" },
    { code: "approval_requested", label: "Menunggu Approval" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.code}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{metrics[k.code] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
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