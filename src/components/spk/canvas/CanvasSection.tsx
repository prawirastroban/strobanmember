// Phase 5.3 — Shared section wrapper for Digital SPK Canvas.
// Preserves paper's visual hierarchy with a numbered rail and role tint.
import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSPKUXSafe } from "./SPKUXContext";

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
  const ux = useSPKUXSafe();
  const ref = useRef<HTMLElement | null>(null);
  const status = id && ux ? ux.statuses[id] ?? null : null;
  const collapsed = id && ux ? ux.isCollapsed(id) : false;

  useEffect(() => {
    if (!ux || !id) return;
    ux.registerSectionRef(id, ref.current);
    return () => ux.registerSectionRef(id, null);
  }, [ux, id]);

  const toggle = () => {
    if (ux && id) ux.toggleCollapsed(id);
  };

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "relative scroll-mt-32 rounded-2xl border border-border bg-card shadow-sm",
        "before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-r-full",
        roleTint[role],
        status === "complete" && "border-emerald-500/40",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-start justify-between gap-3 px-4 py-3",
          !collapsed && "border-b border-border/60",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={!ux || !id}
          className="flex flex-1 items-start gap-3 text-left min-h-tap"
          aria-expanded={!collapsed}
          aria-controls={id ? `${id}-body` : undefined}
        >
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
            {index}
          </span>
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold leading-tight text-foreground">
              <span>
                {title}
                {required && <span className="ml-1 text-primary">*</span>}
              </span>
              {status && <SectionStatusPill status={status} />}
            </h2>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {ux && id && (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40"
              aria-label={collapsed ? "Perluas bagian" : "Ciutkan bagian"}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  collapsed ? "-rotate-90" : "rotate-0",
                )}
              />
            </button>
          )}
        </div>
      </header>
      {!collapsed && (
        <div id={id ? `${id}-body` : undefined} className="p-4">
          {children}
        </div>
      )}
    </section>
  );
}

function SectionStatusPill({
  status,
}: {
  status: "complete" | "in_progress" | "waiting";
}) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        Selesai
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        Berjalan
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Circle className="h-3 w-3" />
      Menunggu
    </span>
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