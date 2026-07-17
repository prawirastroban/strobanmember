// SPK Canvas v2 — Lamps row (multi-toggle sub-lamps + condition + note).
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { condClasses, type Condition } from "./ConditionRow";

const SUB = ["HEAD", "FOG", "TURN", "REVERSE", "REAR", "BRAKE"] as const;
type Sub = (typeof SUB)[number];

export function LampsRow({ alt = true }: { alt?: boolean }) {
  const [lamps, setLamps] = useBinding<Record<Sub, boolean>>("lamps_flags", {
    HEAD: false,
    FOG: false,
    TURN: false,
    REVERSE: false,
    REAR: false,
    BRAKE: false,
  });
  const [cond, setCond] = useBinding<Condition>("lamps_cond", "");
  const [note, setNote] = useBinding<string>("lamps_note", "");

  const toggle = (s: Sub) => setLamps({ ...lamps, [s]: !lamps[s] });

  return (
    <div
      className={`flex flex-col p-3 gap-3 ${
        alt ? "bg-white/[0.03]" : "bg-transparent"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="font-semibold text-foreground text-sm sm:w-24 shrink-0">
          Lamps
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="grid grid-cols-3 gap-1.5 sm:w-[220px] shrink-0">
            {SUB.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition-all ${
                  lamps[s]
                    ? "bg-primary/20 text-primary border-primary/40 ring-1 ring-primary/40 shadow-[0_0_10px_-2px_hsl(var(--primary)/0.5)]"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-col shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 whitespace-nowrap">
              Condition
            </span>
            <div className="flex gap-1">
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