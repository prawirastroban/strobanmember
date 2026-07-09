// Phase 5.3 — Service Report Header (brand strip, SPK number, tanggal, cabang).
import { Sparkles } from "lucide-react";

interface CanvasHeaderProps {
  spkNumber: string;
  branch: string;
  date: string;
}

export function CanvasHeader({ spkNumber, branch, date }: CanvasHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Service Report
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black leading-none tracking-tight text-foreground">
            STROBAN
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-widest text-primary">
            First Class Service
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nomor SPK</p>
          <p className="font-mono text-sm font-bold text-foreground">{spkNumber}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{date}</p>
          <p className="text-[11px] font-medium text-foreground">{branch}</p>
        </div>
      </div>
    </section>
  );
}