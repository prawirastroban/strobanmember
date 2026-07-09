// Phase 5.4A — Tyre Check bound to Form Runtime.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { OkNotToggle, type OkNotValue } from "./OkNotToggle";
import { cn } from "@/lib/utils";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";

type WheelKey = "fl" | "fr" | "rl" | "rr";

const WHEEL_LABEL: Record<WheelKey, string> = {
  fl: "Front Left",
  fr: "Front Right",
  rl: "Rear Left",
  rr: "Rear Right",
};

export function TyreCheckCard() {
  const section = useSectionBinding("tyre");
  const [active, setActive] = useState<WheelKey | null>("fl");
  const [brand, setBrand] = useBinding<string>("tyre_brand", "Bridgestone");
  const [pattern, setPattern] = useBinding<string>("tyre_pattern", "Ecopia EP150");
  const [size, setSize] = useBinding<string>("tyre_size", "185/65 R15");
  const [banBekas, setBanBekas] = useBinding<"bawa" | "tinggal" | null>("tyre_ban_bekas", "bawa");
  const wheels: Record<WheelKey, ReturnType<typeof useWheelBinding>> = {
    fl: useWheelBinding("fl"),
    fr: useWheelBinding("fr"),
    rl: useWheelBinding("rl"),
    rr: useWheelBinding("rr"),
  };
  if (!section.visible) return null;
  const w = active ? wheels[active] : null;
  return (
    <CanvasSection index={6} title="Tyre Check" role="mechanic" id="sec-tyre">
      <div className="space-y-4">
        {/* Diagram */}
        <div className="mx-auto max-w-[220px]">
          <svg viewBox="0 0 140 220" className="h-auto w-full">
            {/* body */}
            <rect
              x="30"
              y="20"
              width="80"
              height="180"
              rx="20"
              className="fill-muted stroke-border"
              strokeWidth="2"
            />
            {/* windshield */}
            <rect x="40" y="35" width="60" height="30" rx="6" className="fill-background/70" />
            {/* rear window */}
            <rect x="40" y="155" width="60" height="30" rx="6" className="fill-background/70" />
            {/* wheels */}
            {(
              [
                { k: "fl" as WheelKey, x: 8, y: 45 },
                { k: "fr" as WheelKey, x: 112, y: 45 },
                { k: "rl" as WheelKey, x: 8, y: 145 },
                { k: "rr" as WheelKey, x: 112, y: 145 },
              ]
            ).map(({ k, x, y }) => {
              const wb = wheels[k];
              const on = active === k;
              const tone =
                wb.value === "ok"
                  ? "fill-emerald-500/80"
                  : wb.value === "not"
                    ? "fill-primary"
                    : "fill-muted-foreground/50";
              return (
                <g key={k} onClick={() => setActive(k)} className="cursor-pointer">
                  <rect
                    x={x}
                    y={y}
                    width="20"
                    height="30"
                    rx="4"
                    className={cn(tone, on && "stroke-primary")}
                    strokeWidth={on ? 3 : 0}
                  />
                  <text
                    x={x + 10}
                    y={y + 19}
                    textAnchor="middle"
                    className="fill-white text-[9px] font-bold"
                  >
                    {k.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Active wheel editor */}
        {active && w && (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{WHEEL_LABEL[active]}</span>
              <div className="flex gap-1">
                {(Object.keys(WHEEL_LABEL) as WheelKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActive(k)}
                    className={cn(
                      "h-7 rounded-md border px-2 text-[10px] font-bold",
                      active === k
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {k.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <FieldLabel>Kedalaman (mm)</FieldLabel>
                <Input
                  value={w.depth}
                  onChange={(e) => w.setDepth(e.target.value)}
                  inputMode="decimal"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>Status</FieldLabel>
                <OkNotToggle
                  value={w.value}
                  onChange={w.setValue}
                  showSc
                  sc={w.sc}
                  onScChange={w.setSc}
                  size="sm"
                />
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <FieldLabel>Catatan Ban</FieldLabel>
              <Input
                value={w.note}
                onChange={(e) => w.setNote(e.target.value)}
                placeholder="mis. aus dalam, tambal, dsb."
                className="h-10"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5" data-field="tyre_brand">
            <FieldLabel>Brand</FieldLabel>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5" data-field="tyre_pattern">
            <FieldLabel>Pattern</FieldLabel>
            <Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5 col-span-2" data-field="tyre_size">
            <FieldLabel>Size</FieldLabel>
            <Input value={size} onChange={(e) => setSize(e.target.value)} className="h-11" />
          </div>
        </div>

        <div className="space-y-1.5" data-field="tyre_ban_bekas">
          <FieldLabel>Ban Bekas</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { k: "bawa" as const, label: "Bawa Pulang" },
                { k: "tinggal" as const, label: "Ditinggal" },
              ]
            ).map((o) => (
              <button
                key={o.k}
                type="button"
                onClick={() => setBanBekas(o.k)}
                className={cn(
                  "h-11 rounded-lg border text-sm font-medium transition-colors",
                  banBekas === o.k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </CanvasSection>
  );
}

function useWheelBinding(k: WheelKey) {
  const [depth, setDepth] = useBinding<string>(`tyre_${k}_depth`, "");
  const [sc, setSc] = useBinding<boolean>(`tyre_${k}_sc`, false);
  const [value, setValue] = useBinding<OkNotValue>(`tyre_${k}_status`, null);
  const [note, setNote] = useBinding<string>(`tyre_${k}_note`, "");
  return { depth, setDepth, sc, setSc, value, setValue, note, setNote };
}