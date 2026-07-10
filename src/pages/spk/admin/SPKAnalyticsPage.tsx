import { useEffect, useState } from "react";
import SPKPlaceholderPanel from "./SPKPlaceholderPanel";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Row = { bucket_date: string; metric_code: string; metric_value: number };

export default function SPKAnalyticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("spk_analytics_daily")
        .select("bucket_date, metric_code, metric_value")
        .gte("bucket_date", since)
        .order("bucket_date", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const totals: Record<string, number> = {};
  for (const r of rows) totals[r.metric_code] = (totals[r.metric_code] ?? 0) + Number(r.metric_value);

  return (
    <SPKPlaceholderPanel
      title="SPK Analytics"
      description="Ringkasan 30 hari terakhir. Semua angka berasal dari Timeline → Events → Workflow."
      reuses="AnalyticsService.readDay() (spk_analytics_daily)"
    >
      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(totals).map(([code, val]) => (
            <Card key={code}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{code}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{val}</p>
              </CardContent>
            </Card>
          ))}
          {Object.keys(totals).length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">Belum ada metrik.</p>
          )}
        </div>
      )}
    </SPKPlaceholderPanel>
  );
}