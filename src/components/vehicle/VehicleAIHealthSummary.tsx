// Kartu ringkas hasil Analisis Kesehatan AI dari SPK (read-only).
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Gauge, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VehicleHealthEntry } from "@/hooks/useVehicleHealthReports";

const TONES: Record<string, { wrap: string; dot: string; text: string; label: string }> = {
  Excellent: { wrap: "bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-500", text: "text-emerald-600", label: "Sangat Baik" },
  Good: { wrap: "bg-primary/10 border-primary/25", dot: "bg-primary", text: "text-primary", label: "Baik" },
  "Needs Attention": { wrap: "bg-amber-500/10 border-amber-500/25", dot: "bg-amber-500", text: "text-amber-600", label: "Perlu Perhatian" },
  Critical: { wrap: "bg-destructive/10 border-destructive/25", dot: "bg-destructive", text: "text-destructive", label: "Kritis" },
};

const toneFor = (s: string) => TONES[s] ?? TONES.Good;

interface Props {
  entry: VehicleHealthEntry;
  /** Ringkas: hanya status + skor (dipakai di list). */
  compact?: boolean;
  vehicleLabel?: string | null;
  onOpenSpk?: (spkId: string) => void;
  className?: string;
}

export function VehicleAIHealthBadge({ entry, className }: { entry: VehicleHealthEntry; className?: string }) {
  const tone = toneFor(entry.report.overall_status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", tone.wrap, tone.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      AI {tone.label}
      {entry.report.score > 0 && <span className="opacity-70">· {entry.report.score}</span>}
    </span>
  );
}

export function VehicleAIHealthSummary({ entry, compact, vehicleLabel, onOpenSpk, className }: Props) {
  const { report } = entry;
  const tone = toneFor(report.overall_status);

  return (
    <Card className={cn("overflow-hidden border", tone.wrap, className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Analisis Kesehatan AI
            </p>
            <p className={cn("text-lg font-bold leading-tight", tone.text)}>{tone.label}</p>
            {vehicleLabel && <p className="text-xs text-muted-foreground truncate">{vehicleLabel}</p>}
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1">
              <Gauge className={cn("h-4 w-4", tone.text)} />
              <span className={cn("text-2xl font-extrabold leading-none", tone.text)}>{report.score}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            {entry.at && (
              <span className="text-[10px] text-muted-foreground mt-1">
                {format(parseISO(entry.at), "dd MMM yyyy", { locale: localeID })}
              </span>
            )}
          </div>
        </div>

        {report.summary && <p className="text-sm text-foreground/90 leading-relaxed">{report.summary}</p>}

        {!compact && report.findings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Temuan
            </p>
            <ul className="space-y-1">
              {report.findings.slice(0, 4).map((f, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className={cn("mt-1.5 h-1 w-1 rounded-full shrink-0", tone.dot)} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!compact && report.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Rekomendasi
            </p>
            <ul className="space-y-1">
              {report.recommendations.slice(0, 4).map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Activity className="h-3 w-3" /> {entry.spkNumber}
            {report.next_service_km ? ` · Servis berikut ~${report.next_service_km.toLocaleString("id-ID")} km` : ""}
          </span>
          {onOpenSpk && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onOpenSpk(entry.spkId)}>
              Lihat SPK <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function VehicleAIHealthEmpty({ className }: { className?: string }) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Belum ada analisis kesehatan AI</p>
          <p className="text-xs text-muted-foreground">
            Analisis otomatis muncul di sini setelah servis (SPK) kendaraan Anda selesai dikerjakan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
