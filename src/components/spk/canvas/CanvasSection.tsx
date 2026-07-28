// Flat wrapper — the Canvas is a single unified document (no numbered
// sections, no collapse, no per-block status pill). We keep the component
// signature so existing call sites don't need to change.
import { useEffect, useRef, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSPKUXSafe } from "./SPKUXContext";
import { SectionScopeCtx, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";

export type SpkRole = "sa" | "mechanic" | "qc" | "system";

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
  /** When true, section is always expanded and the collapse toggle is hidden. */
  forceOpen?: boolean;
}

export function CanvasSection({
  index: _index,
  title,
  subtitle,
  role: _role = "sa",
  actions,
  children,
  className,
  id,
  required,
  forceOpen: _forceOpen,
}: CanvasSectionProps) {
  const ux = useSPKUXSafe();
  const ref = useRef<HTMLElement | null>(null);
  const sectionCode = id?.startsWith("sec-") ? id.slice(4) : id ?? "";
  const scope = useSectionBinding(sectionCode);

  useEffect(() => {
    if (!ux || !id) return;
    ux.registerSectionRef(id, ref.current);
    return () => ux.registerSectionRef(id, null);
  }, [ux, id]);

  if (sectionCode && !scope.visible) return null;
  const readOnly = !!sectionCode && !scope.editable;

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "relative scroll-mt-32 rounded-2xl border border-border bg-card shadow-sm",
        readOnly && "opacity-95",
        className,
      )}
      aria-readonly={readOnly || undefined}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border/60 px-3 py-3 sm:px-4">
        <div className="min-w-0 flex-1 basis-[12rem]">
          <h2 className="flex flex-wrap items-center gap-2 text-[clamp(0.85rem,2.6vw,1rem)] font-semibold leading-snug text-foreground">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {title}
              {required && <span className="ml-1 text-primary">*</span>}
            </span>
            {readOnly && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Lock className="h-3 w-3" /> Read-only
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="mt-0.5 min-w-0 break-words text-[clamp(0.66rem,1.9vw,0.75rem)] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1">{actions}</div>}
      </header>
      <SectionScopeCtx.Provider
        value={sectionCode ? { code: sectionCode, editable: !readOnly } : null}
      >
        <div
          id={id ? `${id}-body` : undefined}
          className={cn(
            "w-full max-w-full p-3 sm:p-4",
            readOnly && "pointer-events-none select-none",
          )}
        >
          {children}
        </div>
      </SectionScopeCtx.Provider>
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