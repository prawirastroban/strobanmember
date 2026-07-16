// SPK Canvas v2 — Tyre Check panel.
// Diagram 4-posisi ban + form Brand/Pattern/Size + Ban Bekas toggle + per-posisi kondisi.
import { useState } from "react";
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import type { Condition } from "./ConditionRow";

const POSITIONS = ["FL", "FR", "RL", "RR"] as const;
type Pos = (typeof POSITIONS)[number];

const POS_LABEL: Record<Pos, string> = {
  FL: "Front Left",
  FR: "Front Right",
  RL: "Rear Left",
  RR: "Rear Right",
};

function condBtn(active: Condition, target: Exclude<Condition, "">) {
  const on = active === target;
  const base =
    "w-14 h-8 rounded text-xs font-bold border-2 transition-all";
  if (target === "good")
    return on
      ? `${base} bg-[color:#00ff00] text-black border-[#00aa00]`
      : `${base} bg-green-100 text-green-800 border-transparent hover:bg-green-200`;
  if (target === "ok")
    return on
      ? `${base} bg-[color:#ffcc00] text-black border-[#cca300]`
      : `${base} bg-yellow-100 text-yellow-800 border-transparent hover:bg-yellow-200`;
  return on
    ? `${base} bg-[color:#b34700] text-white border-[#803300]`
    : `${base} bg-orange-100 text-orange-800 border-transparent hover:bg-orange-200`;
}

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
      ? "bg-[color:#00ff00] text-black"
      : cond === "ok"
        ? "bg-[color:#ffcc00] text-black"
        : cond === "bad"
          ? "bg-[color:#b34700] text-white"
          : active
            ? "bg-[color:#ff0000] text-white"
            : "bg-white text-[color:#ff0000]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-12 h-16 border-2 border-[color:#ff0000] rounded flex items-center justify-center font-bold hover:bg-red-50 transition-colors ${bg}`}
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
    <div className="flex flex-col lg:flex-row border-2 border-[color:#ff0000] rounded-lg mb-6 overflow-hidden">
      <div className="bg-[color:#ff0000] text-white flex items-center justify-center p-3 font-bold tracking-widest text-base lg:w-12">
        <span className="lg:[writing-mode:vertical-rl] lg:rotate-180 whitespace-nowrap">
          TYRE CHECK
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Diagram */}
        <div className="flex flex-col items-center justify-center gap-3 lg:border-r-2 lg:border-[color:#ffe6e6] lg:pr-6">
          <div className="flex gap-12">
            {(["FL", "FR"] as Pos[]).map((p) => (
              <TyrePosBinding key={p} pos={p} active={active} setActive={setActive} />
            ))}
          </div>
          <div className="w-16 h-20 border-2 border-gray-300 rounded-md my-1 opacity-50 relative">
            <div className="absolute inset-x-2 top-2 bottom-2 border border-gray-200 rounded-sm" />
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
            <div className="border border-[color:#ff0000] rounded p-2 text-center">
              <div className="text-[color:#ff0000] font-bold text-xs mb-2 border-b border-[color:#ff0000] pb-1">
                Ban Bekas
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setBanBekas("bawa")}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    banBekas === "bawa"
                      ? "bg-[color:#ff0000] text-white"
                      : "border border-[color:#ff0000] text-[color:#ff0000] hover:bg-red-50"
                  }`}
                >
                  Bawa pulang
                </button>
                <button
                  type="button"
                  onClick={() => setBanBekas("tinggal")}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    banBekas === "tinggal"
                      ? "bg-[color:#ff0000] text-white"
                      : "border border-[color:#ff0000] text-[color:#ff0000] hover:bg-red-50"
                  }`}
                >
                  Ditinggal
                </button>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-[color:#ffe6e6] pt-4">
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
      <label className="block text-[color:#ff0000] font-bold text-xs mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-100 border-none p-2 rounded text-sm focus:ring-2 focus:ring-[color:#ff0000] outline-none"
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
            className={`w-10 h-10 font-bold rounded ${
              p === pos
                ? "bg-[color:#ff0000] text-white"
                : "border border-[color:#ff0000] text-[color:#ff0000]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div>
        <h4 className="text-[color:#ff0000] font-bold text-base">{POS_LABEL[pos]}</h4>
      </div>
      <div>
        <label className="block text-gray-500 text-[10px] mb-1">Kedalaman (mm)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="w-20 bg-gray-100 border-none p-2 rounded text-right outline-none"
          />
          <span className="text-sm text-gray-500">mm</span>
        </div>
      </div>
      <div>
        <label className="block text-gray-500 text-[10px] mb-1">Condition</label>
        <div className="flex gap-1">
          <button type="button" onClick={() => setCond("good")} className={condBtn(cond, "good")}>
            GOOD
          </button>
          <button type="button" onClick={() => setCond("ok")} className={condBtn(cond, "ok")}>
            OK
          </button>
          <button type="button" onClick={() => setCond("bad")} className={condBtn(cond, "bad")}>
            BAD
          </button>
        </div>
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-gray-500 text-[10px] mb-1">Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan"
          className="w-full bg-gray-100 border-none p-2 rounded text-sm outline-none focus:ring-1 focus:ring-[color:#ff0000]"
        />
      </div>
    </div>
  );
}