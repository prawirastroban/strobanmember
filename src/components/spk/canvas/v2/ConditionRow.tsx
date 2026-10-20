// SPK Canvas v2 — reusable checklist row (GOOD/OK/BAD + note),
// styling mirrors the mockup: alternating red-light background, red label,
// gray note input focusing to white.
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";

export type Condition = "good" | "ok" | "bad" | "";

const BTN_BASE =
  "flex-1 min-w-[52px] sm:flex-none sm:w-14 h-8 rounded-lg text-[11px] font-bold transition-all";

export function condClasses(active: Condition, target: Exclude<Condition, "">): string {
  const on = active === target;
  if (target === "good")
    return on
      ? `${BTN_BASE} bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/50 shadow-[0_0_12px_-2px_rgba(52,211,153,0.5)]`
      : `${BTN_BASE} bg-white/5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-300`;
  if (target === "ok")
    return on
      ? `${BTN_BASE} bg-amber-400/25 text-amber-200 ring-1 ring-amber-400/50 shadow-[0_0_12px_-2px_rgba(251,191,36,0.5)]`
      : `${BTN_BASE} bg-white/5 text-muted-foreground hover:bg-amber-400/10 hover:text-amber-200`;
  return on
    ? `${BTN_BASE} bg-destructive/25 text-destructive ring-1 ring-destructive/50 shadow-[0_0_12px_-2px_hsl(var(--destructive)/0.5)]`
    : `${BTN_BASE} bg-white/5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive`;
}

const PAPER_OPTS: { v: Exclude<Condition, "">; label: string; on: string }[] = [
  { v: "good", label: "Good", on: "border-success bg-success text-success-foreground" },
  { v: "ok", label: "Attention", on: "border-warning bg-warning text-warning-foreground" },
  { v: "bad", label: "Replace", on: "border-primary bg-primary text-primary-foreground" },
];

export function ConditionRow({
  label,
  fieldPrefix,
}: {
  label: string;
  /** Field code prefix — reads `${prefix}_cond` and `${prefix}_note`. */
  fieldPrefix: string;
  alt?: boolean;
}) {
  const [cond, setCond] = useBinding<Condition>(`${fieldPrefix}_cond`, "");
  const [note, setNote] = useBinding<string>(`${fieldPrefix}_note`, "");
  const showNote = (cond && cond !== "good") || !!note;
  return (
    <div className="min-w-0 px-2 py-1" data-field={`${fieldPrefix}_cond`}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 flex-1 basis-[8rem] break-words text-[12.5px] font-medium text-foreground">{label}</span>
        <div className="flex shrink-0 gap-1" role="group" aria-label={label}>
          {PAPER_OPTS.map((o) => (
            <button
              key={o.v}
              type="button"
              aria-pressed={cond === o.v}
              onClick={() => setCond(cond === o.v ? "" : o.v)}
              className={`h-6 rounded-sm border px-1.5 text-[10.5px] font-semibold italic transition-colors ${
                cond === o.v ? o.on : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {showNote && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan…"
          aria-label={`Catatan ${label}`}
          className="mt-1 h-7 w-full rounded-sm border border-border bg-background px-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
        />
      )}
    </div>
  );
}
