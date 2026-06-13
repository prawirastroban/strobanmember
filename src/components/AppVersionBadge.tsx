import { Badge } from "@/components/ui/badge";
import { Rocket, Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppVersion } from "@/hooks/useAppVersion";
import { hardReload } from "@/lib/appVersion";

interface Props {
  variant?: "inline" | "pill" | "card";
  className?: string;
}

const AppVersionBadge = ({ variant = "inline", className = "" }: Props) => {
  const { latest, current, mismatch, loading } = useAppVersion();
  const display = latest || current;

  if (variant === "inline") {
    return (
      <span className={`text-[11px] text-muted-foreground font-mono ${className}`}>
        {loading ? "…" : `v${display}`}
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <Badge variant="outline" className={`gap-1 font-mono text-[11px] ${className}`}>
        <Rocket className="h-3 w-3 text-primary" />
        v{loading ? "…" : display}
      </Badge>
    );
  }

  // card variant
  return (
    <div className={`rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 flex items-center gap-3 ${className}`}>
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">Versi Aplikasi</p>
          {mismatch ? (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" /> Tertinggal
            </Badge>
          ) : (
            <Badge className="text-[10px] gap-1 bg-green-500/15 text-green-600 hover:bg-green-500/15">
              <CheckCircle2 className="h-3 w-3" /> Terbaru
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
          Live: v{latest || "—"} · Build Anda: v{current}
        </p>
      </div>
      {mismatch && (
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => void hardReload(latest || undefined)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Perbarui
        </Button>
      )}
    </div>
  );
};

export default AppVersionBadge;