// Phase 5.3 — OK / NOT OK / N/A segmented toggle with optional "SC" chip.
// Design-only. State managed by parent.
import { cn } from "@/lib/utils";

export type OkNotValue = "ok" | "not" | "na" | null;

interface OkNotToggleProps {
  value: OkNotValue;
  onChange: (v: OkNotValue) => void;
  sc?: boolean;
  onScChange?: (v: boolean) => void;
  showSc?: boolean;
  size?: "sm" | "md";
}

export function OkNotToggle({
  value,
  onChange,
  sc = false,
  onScChange,
  showSc = false,
  size = "md",
}: OkNotToggleProps) {
  const h = size === "sm" ? "h-9" : "h-11";
  const base =
    "flex-1 inline-flex items-center justify-center text-xs font-semibold rounded-md transition-colors select-none";
  return (
    <div className="flex items-center gap-2">
      <div
        role="radiogroup"
        className={cn("flex gap-1 rounded-lg border border-border bg-muted/40 p-1", h)}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === "ok"}
          onClick={() => onChange(value === "ok" ? null : "ok")}
          className={cn(
            base,
            "px-3",
            value === "ok"
              ? "bg-emerald-500/90 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          OK
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === "not"}
          onClick={() => onChange(value === "not" ? null : "not")}
          className={cn(
            base,
            "px-3",
            value === "not"
              ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          NOT
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === "na"}
          onClick={() => onChange(value === "na" ? null : "na")}
          className={cn(
            base,
            "px-3",
            value === "na"
              ? "bg-foreground/80 text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          N/A
        </button>
      </div>
      {showSc && (
        <button
          type="button"
          aria-pressed={sc}
          onClick={() => onScChange?.(!sc)}
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold tracking-wider",
            sc
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
          title="Sudah Cek"
        >
          SC
        </button>
      )}
    </div>
  );
}