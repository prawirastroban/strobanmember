// Phase 5.3 — Shared section wrapper for Digital SPK Canvas.
// Preserves paper's visual hierarchy with a numbered rail and role tint.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SpkRole = "sa" | "mechanic" | "qc" | "system";

const roleTint: Record<SpkRole, string> = {
  sa: "before:bg-sky-500/60",
  mechanic: "before:bg-amber-500/70",
  qc: "before:bg-emerald-500/70",
  system: "before:bg-muted-foreground/40",
};

interface CanvasSectionProps {
  index: number;
  title: string;
  subtitle?: string;
  role?: SpkRole;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  required?: boolean;
}

export function CanvasSection({
  index,
  title,
  subtitle,
  role = "sa",
  actions,
  children,
  className,
  id,
  required,
}: CanvasSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-32 rounded-2xl border border-border bg-card shadow-sm",
        "before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-r-full",
        roleTint[role],
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
            {index}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight text-foreground">
              {title}
              {required && <span className="ml-1 text-primary">*</span>}
            </h2>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {children}
      {required && <span className="ml-0.5 text-primary">*</span>}
    </span>
  );
}

export function InspectionRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2.5 last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}