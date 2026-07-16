// SPK Canvas v2 — Tyre Check panel.
// Diagram 4-posisi ban + form Brand/Pattern/Size + Ban Bekas toggle + per-posisi kondisi.
import { useState } from "react";
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { condClasses, type Condition } from "./ConditionRow";

const POSITIONS = ["FL", "FR", "RL", "RR"] as const;
type Pos = (typeof POSITIONS)[number];

const POS_LABEL: Record<Pos, string> = {
  FL: "Front Left",
  FR: "Front Right",
  RL: "Rear Left",
  RR: "Rear Right",
};

function PositionButton({
  pos,
  active,
  cond,
  onClick,
}: {
  pos: Pos;
  active: boolean;
  cond: Condition;
  onClick: () => void;
}) {
  const bg =
    cond === "good"
      ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/50"
      : cond === "ok"
        ? "bg-amber-400/25 text-amber-200 ring-1 ring-amber-400/50"
        : cond === "bad"
          ? "bg-destructive/25 text-destructive ring-1 ring-destructive/50"
          : active
            ? "bg-primary/25 text-primary ring-1 ring-primary/50"
            : "bg-white/5 text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-12 h-16 border border-white/10 rounded-lg flex items-center justify-center font-bold transition-all backdrop-blur-md hover:border-primary/40 ${bg}`}
    >
      {pos}
    </button>
  );
}

export function TyreCheckPanel() {
  const [brand, setBrand] = useBinding<string>("tyre_brand", "");
  const [pattern, setPattern] = useBinding<string>("tyre_pattern", "");
  const [size, setSize] = useBinding<string>("tyre_size", "");
  const [banBekas, setBanBekas] = useBinding<"bawa" | "tinggal" | "">(
    "tyre_ban_bekas",
    "",
  );

  const [active, setActive] = useState<Pos>("FL");

  return (
    <div className="flex flex-col lg:flex-row rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md mb-6 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-b from-primary/25 to-primary/10 text-primary flex items-center justify-center p-3 font-bold tracking-widest text-base lg:w-12 border-b lg:border-b-0 lg:border-r border-white/10">
        <span className="lg:[writing-mode:vertical-rl] lg:rotate-180 whitespace-nowrap">
          TYRE CHECK
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Diagram */}
        <div className="flex flex-col items-center justify-center gap-3 lg:border-r lg:border-white/10 lg:pr-6">
          <div className="flex gap-12">
            {(["FL", "FR"] as Pos[]).map((p) => (
              <TyrePosBinding key={p} pos={p} active={active} setActive={setActive} />
            ))}
          </div>
          <div className="w-16 h-20 border border-white/15 rounded-md my-1 opacity-60 relative bg-white/[0.02]">
            <div className="absolute inset-x-2 top-2 bottom-2 border border-white/10 rounded-sm" />
          </div>
          <div className="flex gap-12">
            {(["RL", "RR"] as Pos[]).map((p) => (
              <TyrePosBinding key={p} pos={p} active={active} setActive={setActive} />
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            <FieldInput label="Tyre Brand" value={brand} onChange={setBrand} />
            <FieldInput label="Pattern / Type" value={pattern} onChange={setPattern} />
            <FieldInput label="Tyre Size" value={size} onChange={setSize} />
            <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md p-2 text-center">
              <div className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-2 border-b border-white/10 pb-1">
                Ban Bekas
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setBanBekas("bawa")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    banBekas === "bawa"
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : "border border-white/10 bg-white/5 text-muted-foreground hover:text-primary hover:border-primary/40"
                  }`}
                >
                  Bawa pulang
                </button>
                <button
                  type="button"
                  onClick={() => setBanBekas("tinggal")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    banBekas === "tinggal"
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : "border border-white/10 bg-white/5 text-muted-foreground hover:text-primary hover:border-primary/40"
                  }`}
                >
                  Ditinggal
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <TyreDetail pos={active} setActive={setActive} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 min-w-[140px]">
      <label className="block text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-background/40 p-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
      />
    </div>
  );
}

function TyrePosBinding({
  pos,
  active,
  setActive,
}: {
  pos: Pos;
  active: Pos;
  setActive: (p: Pos) => void;
}) {
  const [cond] = useBinding<Condition>(`tyre_${pos.toLowerCase()}_cond`, "");
  return (
    <PositionButton
      pos={pos}
      active={active === pos}
      cond={cond}
      onClick={() => setActive(pos)}
    />
  );
}

function TyreDetail({ pos, setActive }: { pos: Pos; setActive: (p: Pos) => void }) {
  const [depth, setDepth] = useBinding<string>(`tyre_${pos.toLowerCase()}_depth`, "");
  const [cond, setCond] = useBinding<Condition>(`tyre_${pos.toLowerCase()}_cond`, "");
  const [note, setNote] = useBinding<string>(`tyre_${pos.toLowerCase()}_note`, "");

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex gap-2">
        {POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setActive(p)}
            className={`w-10 h-10 font-bold rounded-lg transition-all ${
              p === pos
                ? "bg-primary text-primary-foreground shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-primary hover:border-primary/40"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div>
        <h4 className="text-foreground font-semibold text-base">{POS_LABEL[pos]}</h4>
      </div>
      <div>
        <label className="block text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Kedalaman (mm)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="w-20 rounded-lg border border-white/10 bg-background/40 p-2 text-right text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
          />
          <span className="text-sm text-muted-foreground">mm</span>
        </div>
      </div>
      <div>
        <label className="block text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Condition</label>
        <div className="flex gap-1">
          <button type="button" onClick={() => setCond("good")} className={condClasses(cond, "good")}>
            GOOD
          </button>
          <button type="button" onClick={() => setCond("ok")} className={condClasses(cond, "ok")}>
            OK
          </button>
          <button type="button" onClick={() => setCond("bad")} className={condClasses(cond, "bad")}>
            BAD
          </button>
        </div>
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan"
          className="w-full rounded-lg border border-white/10 bg-background/40 p-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
        />
      </div>
    </div>
  );
}