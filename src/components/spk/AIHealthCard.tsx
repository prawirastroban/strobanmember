// AI Vehicle Health Card — reads spk_orders.ai_health_report,
// allows regenerate via edge function, falls back to deterministic score.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, HeartPulse, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type HealthReport = {
  overall_status: "Excellent" | "Good" | "Needs Attention" | "Critical";
  score: number;
  summary?: string;
  findings?: string[];
  recommendations?: string[];
  next_service_km?: number | string;
  generated_at?: string;
};

const STATUS_META: Record<HealthReport["overall_status"], { color: string; badge: string; icon: any }> = {
  Excellent: { color: "text-emerald-600", badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  Good: { color: "text-sky-600", badge: "bg-sky-500/10 text-sky-700 border-sky-500/30", icon: HeartPulse },
  "Needs Attention": { color: "text-amber-600", badge: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: AlertTriangle },
  Critical: { color: "text-red-600", badge: "bg-red-500/10 text-red-700 border-red-500/30", icon: AlertTriangle },
};

export default function AIHealthCard({
  spk,
  readOnly = false,
  print = false,
  onUpdated,
}: {
  spk: any;
  readOnly?: boolean;
  print?: boolean;
  onUpdated?: (report: HealthReport) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<HealthReport | null>((spk?.ai_health_report as HealthReport) ?? null);

  const regenerate = async () => {
    if (!spk?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("spk-health-analysis", {
        body: { spk_id: spk.id },
      });
      if (error) throw error;
      const result = (data?.report ?? null) as HealthReport | null;
      if (result) {
        setReport(result);
        onUpdated?.(result);
        toast.success("Analisis kesehatan diperbarui");
      } else {
        toast.error("Gagal memuat analisis", { description: "Coba lagi sebentar" });
      }
    } catch (e: any) {
      toast.error("Gagal menganalisis", { description: e?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const wrapperCls = print
    ? "border border-black/40 rounded-md p-3"
    : "rounded-xl border border-border bg-card p-4 shadow-sm";

  if (!report) {
    return (
      <div className={wrapperCls}>
        <div className="flex items-start gap-3">
          <div className={cn("rounded-lg p-2", print ? "bg-black/5" : "bg-primary/10 text-primary")}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", print ? "text-black" : "text-foreground")}>
              Analisis Kesehatan Kendaraan (AI)
            </p>
            <p className={cn("text-xs mt-0.5", print ? "text-black/60" : "text-muted-foreground")}>
              Belum ada analisis. {readOnly ? "Menunggu hasil dari bengkel." : "Jalankan setelah inspeksi selesai."}
            </p>
            {!readOnly && !print && (
              <Button size="sm" onClick={regenerate} disabled={loading} className="mt-3 gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Analisis Sekarang
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[report.overall_status] ?? STATUS_META.Good;
  const Icon = meta.icon;

  return (
    <div className={wrapperCls}>
      <div className="flex items-start gap-3">
        <div className={cn("rounded-lg p-2", print ? "bg-black/5" : "bg-primary/10")}>
          <Icon className={cn("h-4 w-4", print ? "text-black" : meta.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm font-semibold", print ? "text-black" : "text-foreground")}>
              Analisis Kesehatan Kendaraan
            </p>
            <Badge variant="outline" className={cn("text-[10px]", print ? "" : meta.badge)}>
              {report.overall_status}
            </Badge>
            <span className={cn("text-[11px] tabular-nums", print ? "text-black/70" : "text-muted-foreground")}>
              Skor {Math.round(report.score)}/100
            </span>
          </div>
          {report.summary && (
            <p className={cn("text-xs mt-1.5", print ? "text-black/80" : "text-muted-foreground")}>
              {report.summary}
            </p>
          )}
          {!!report.findings?.length && (
            <div className="mt-2">
              <p className={cn("text-[10px] font-bold uppercase", print ? "text-black/60" : "text-muted-foreground")}>
                Temuan
              </p>
              <ul className={cn("mt-0.5 list-disc pl-4 text-xs space-y-0.5", print ? "text-black" : "text-foreground")}>
                {report.findings.map((f, i) => (<li key={i}>{f}</li>))}
              </ul>
            </div>
          )}
          {!!report.recommendations?.length && (
            <div className="mt-2">
              <p className={cn("text-[10px] font-bold uppercase", print ? "text-black/60" : "text-muted-foreground")}>
                Rekomendasi
              </p>
              <ul className={cn("mt-0.5 list-disc pl-4 text-xs space-y-0.5", print ? "text-black" : "text-foreground")}>
                {report.recommendations.map((f, i) => (<li key={i}>{f}</li>))}
              </ul>
            </div>
          )}
          {report.next_service_km && (
            <p className={cn("text-[11px] mt-2", print ? "text-black/70" : "text-muted-foreground")}>
              Servis berikutnya disarankan pada: <span className="font-semibold">{report.next_service_km} km</span>
            </p>
          )}
          {!readOnly && !print && (
            <Button size="sm" variant="ghost" onClick={regenerate} disabled={loading} className="mt-3 gap-1.5 h-8 text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Perbarui Analisis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}