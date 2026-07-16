// SPK Canvas v2 — Lamps row (multi-toggle sub-lamps + condition + note).
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import type { Condition } from "./ConditionRow";

const SUB = ["HEAD", "FOG", "TURN", "REVERSE", "REAR", "BRAKE"] as const;
type Sub = (typeof SUB)[number];

function condBtn(active: Condition, target: Exclude<Condition, "">) {
  const on = active === target;
  const base = "w-14 h-8 rounded text-xs font-bold transition-all";
  if (target === "good")
    return on
      ? `${base} bg-[color:#00ff00] text-black`
      : `${base} bg-green-100 text-green-800 hover:bg-green-200`;
  if (target === "ok")
    return on
      ? `${base} bg-[color:#ffcc00] text-black`
      : `${base} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`;
  return on
    ? `${base} bg-[color:#b34700] text-white`
    : `${base} bg-orange-100 text-orange-800 hover:bg-orange-200`;
}

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
      className={`flex flex-col md:flex-row items-stretch md:items-center border-b border-gray-200 p-3 gap-3 ${
        alt ? "bg-[color:#ffe6e6]" : "bg-white"
      }`}
    >
      <div className="md:w-1/4 font-bold text-[color:#ff0000] text-sm">Lamps</div>
      <div className="flex flex-wrap gap-1.5">
        {SUB.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={`text-xs font-bold px-3 py-1 rounded border ${
              lamps[s]
                ? "bg-[color:#ff0000] text-white border-[color:#ff0000]"
                : "bg-white text-gray-700 border-gray-400 hover:bg-gray-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-col">
        <span className="hidden md:block text-[10px] text-gray-400 uppercase mb-1">
          Condition
        </span>
        <div className="flex gap-1">
          <button type="button" className={condBtn(cond, "good")} onClick={() => setCond("good")}>
            GOOD
          </button>
          <button type="button" className={condBtn(cond, "ok")} onClick={() => setCond("ok")}>
            OK
          </button>
          <button type="button" className={condBtn(cond, "bad")} onClick={() => setCond("bad")}>
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