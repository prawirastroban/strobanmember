import { useEffect, useMemo, useState } from "react";
import SPKPlaceholderPanel from "./SPKPlaceholderPanel";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";

type Row = { bucket_date: string; metric_code: string; metric_value: number };

export default function SPKReportsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("spk_analytics_daily")
        .select("bucket_date, metric_code, metric_value")
        .gte("bucket_date", since)
        .order("bucket_date", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const csv = useMemo(() => {
    const header = "bucket_date,metric_code,metric_value";
    const body = rows.map((r) => `${r.bucket_date},${r.metric_code},${r.metric_value}`).join("\n");
    return `${header}\n${body}`;
  }, [rows]);

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spk-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SPKPlaceholderPanel
      title="SPK Reports"
      description="Laporan SPK (90 hari terakhir). Presentasi saja — tidak ada perhitungan ulang."
      reuses="AnalyticsService (spk_analytics_daily)"
    >
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Ringkasan 90 hari</p>
            <p className="text-xs text-muted-foreground">{loading ? "…" : `${rows.length} baris`}</p>
          </div>
          <Button onClick={download} disabled={loading || rows.length === 0} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Ekspor CSV
          </Button>
        </CardContent>
      </Card>
    </SPKPlaceholderPanel>
  );
}