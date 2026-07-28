// Label + value pair. Stacks below md, side-by-side from md up.
// Values always wrap; nothing is truncated.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { spkType, spkWrap } from "./spk-type";

interface SpkFieldProps {
  label: ReactNode;
  children: ReactNode;
  /** Render the value in monospace with break-all (codes, plates, links). */
  mono?: boolean;
  className?: string;
}

export function SpkField({ label, children, mono, className }: SpkFieldProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full flex-col gap-0.5 md:flex-row md:items-baseline md:gap-3",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 shrink-0 uppercase tracking-wide text-muted-foreground md:w-[38%] md:max-w-[10rem]",
          spkType.label,
          spkWrap,
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "flex-1 text-foreground",
          mono ? "min-w-0 break-all font-mono" : spkWrap,
          mono ? spkType.mono : spkType.value,
        )}
      >
        {children}
      </span>
    </div>
  );
}