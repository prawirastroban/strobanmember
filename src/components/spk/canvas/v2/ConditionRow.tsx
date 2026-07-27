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

export function ConditionRow({
  label,
  fieldPrefix,
  alt = false,
}: {
  label: string;
  /** Field code prefix — will read `${prefix}_cond` and `${prefix}_note`. */
  fieldPrefix: string;
  alt?: boolean;
}) {
  const [cond, setCond] = useBinding<Condition>(`${fieldPrefix}_cond`, "");
  const [note, setNote] = useBinding<string>(`${fieldPrefix}_note`, "");
  return (
    <div
      className={`flex min-w-0 flex-col p-3 gap-3 ${
        alt ? "bg-white/[0.03]" : "bg-transparent"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 break-words text-sm font-semibold text-foreground sm:w-32 sm:shrink-0">
          {label}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Condition
          </span>
          <div className="flex w-full gap-1 sm:w-auto">
            <button type="button" className={condClasses(cond, "good")} onClick={() => setCond("good")}>
              GOOD
            </button>
            <button type="button" className={condClasses(cond, "ok")} onClick={() => setCond("ok")}>
              OK
            </button>
            <button type="button" className={condClasses(cond, "bad")} onClick={() => setCond("bad")}>
              BAD
            </button>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 whitespace-nowrap">
          Note
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan (opsional)"
          className="w-full h-10 rounded-lg border border-white/10 bg-background/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
        />
      </div>
    </div>
  );
}