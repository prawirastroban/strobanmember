// Phase 5.3 — Service Report Header (brand strip, SPK number, tanggal, cabang).
// Mobile-first: the brand block and the meta block sit on one flex-wrap row
// and always stay horizontal — never truncated, never rotated.
import { Sparkles } from "lucide-react";
import { spkType, spkWrap, spkWrapCode } from "@/components/spk/ui";
import { cn } from "@/lib/utils";

interface CanvasHeaderProps {
  spkNumber: string;
  branch: string;
  date: string;
}

export function CanvasHeader({ spkNumber, branch, date }: CanvasHeaderProps) {
  return (
    <section
      data-spk-card
      className="relative w-full max-w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-3 sm:p-4"
    >
      <div className="flex w-full max-w-full flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-[12rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span
              className={cn(
                "uppercase tracking-[0.18em] text-muted-foreground",
                spkType.label,
                spkWrap,
              )}
            >
              Service Report
            </span>
          </div>
          <h1
            className={cn(
              "mt-1 whitespace-nowrap font-black tracking-tight text-foreground",
              spkType.title,
            )}
          >
            STROBAN
          </h1>
          <p
            className={cn(
              "font-medium uppercase tracking-widest text-primary",
              spkType.label,
              spkWrap,
            )}
          >
            First Class Service
          </p>
        </div>
        <div className="min-w-0 flex-1 basis-[10rem] sm:text-right">
          <p className={cn("uppercase tracking-wider text-muted-foreground", spkType.label)}>
            Nomor SPK
          </p>
          <p className={cn("font-bold text-foreground", spkType.mono, spkWrapCode)}>{spkNumber}</p>
          <p className={cn("mt-1 text-muted-foreground", spkType.meta, spkWrap)}>{date}</p>
          <p className={cn("font-medium text-foreground", spkType.meta, spkWrap)}>{branch}</p>
        </div>
      </div>
    </section>
  );
}