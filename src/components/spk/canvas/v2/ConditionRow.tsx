// SPK Canvas v2 — reusable checklist row (GOOD/OK/BAD + note),
// styling mirrors the mockup: alternating red-light background, red label,
// gray note input focusing to white.
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";

export type Condition = "good" | "ok" | "bad" | "";

const BTN_BASE =
  "w-14 h-8 rounded text-xs font-bold border-2 border-transparent transition-all";

function condClasses(active: Condition, target: Exclude<Condition, "">): string {
  const on = active === target;
  if (target === "good")
    return on
      ? `${BTN_BASE} bg-[color:#00ff00] text-black border-[#00aa00]`
      : `${BTN_BASE} bg-green-100 text-green-800 hover:bg-green-200`;
  if (target === "ok")
    return on
      ? `${BTN_BASE} bg-[color:#ffcc00] text-black border-[#cca300]`
      : `${BTN_BASE} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`;
  return on
    ? `${BTN_BASE} bg-[color:#b34700] text-white border-[#803300]`
    : `${BTN_BASE} bg-orange-100 text-orange-800 hover:bg-orange-200`;
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
      className={`flex flex-col md:flex-row items-stretch md:items-center border-b border-gray-200 p-3 gap-3 ${
        alt ? "bg-[color:#ffe6e6]" : "bg-white"
      }`}
    >
      <div className="md:w-1/4 font-bold text-[color:#ff0000] text-sm md:text-left">
        {label}
      </div>
      <div className="flex flex-col md:w-auto">
        <span className="hidden md:block text-[10px] text-gray-400 uppercase mb-1">
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
      <div className="flex-1 w-full flex flex-col">
        <span className="hidden md:block text-[10px] text-gray-400 uppercase mb-1">
          Note
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan (opsional)"
          className="w-full bg-gray-100 border-none p-2 rounded text-sm focus:ring-1 focus:ring-[color:#ff0000] focus:bg-white transition-colors outline-none"
        />
      </div>
    </div>
  );
}