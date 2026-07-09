// Phase 5.3 — Engine / Brake / Fluid Check + Lamps + Electrical (paper section).
import { useState } from "react";
import { CanvasSection, FieldLabel, InspectionRow } from "./CanvasSection";
import { OkNotToggle, type OkNotValue } from "./OkNotToggle";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ENGINE_ITEMS: { key: string; label: string; sc?: boolean }[] = [
  { key: "engine_oil", label: "Engine Oil", sc: true },
  { key: "brake_fluid", label: "Brake Fluid", sc: true },
  { key: "spark_plug", label: "Spark Plug" },
  { key: "packing_seal", label: "Packing Seal", sc: true },
  { key: "power_steering_fluid", label: "Power Steering Fluid" },
  { key: "coolant", label: "Coolant", sc: true },
  { key: "transmission_fluid", label: "Transmission Fluid" },
  { key: "matic_transmission", label: "Matic Transmision" },
  { key: "diff_gear_oil", label: "Differential Gear Oil" },
  { key: "brake_pad_front", label: "Brake Pad — Front", sc: true },
  { key: "brake_pad_rear", label: "Brake Pad — Rear", sc: true },
  { key: "v_belt", label: "V-Belt", sc: true },
  { key: "brake_cylinder", label: "Brake Cylinder" },
  { key: "brake_calipers", label: "Brake Calipers" },
];

const LAMPS = ["Head", "Fog", "Side", "Rear", "Brake"];

const ELECTRICAL: { key: string; label: string; sc?: boolean }[] = [
  { key: "wiper_blades", label: "Wiper Blades", sc: true },
  { key: "wiper_fluid", label: "Wiper Fluid", sc: true },
  { key: "battery", label: "Battery", sc: true },
  { key: "alternator", label: "Alternator" },
];

export function InspectionEngineCard() {
  const [values, setValues] = useState<Record<string, OkNotValue>>({});
  const [sc, setSc] = useState<Record<string, boolean>>({});
  const [lamps, setLamps] = useState<Record<string, OkNotValue>>({});

  const setVal = (k: string, v: OkNotValue) => setValues((s) => ({ ...s, [k]: v }));
  const setLamp = (k: string, v: OkNotValue) => setLamps((s) => ({ ...s, [k]: v }));
  const setScFor = (k: string, v: boolean) => setSc((s) => ({ ...s, [k]: v }));

  return (
    <CanvasSection index={8} title="Engine / Brake / Fluid Check" role="mechanic" id="sec-engine">
      <div className="space-y-5">
        <div>
          <FieldLabel>Engine · Brake · Fluid</FieldLabel>
          <div className="mt-2 divide-y divide-border/40">
            {ENGINE_ITEMS.map((it) => (
              <InspectionRow key={it.key} label={it.label}>
                <OkNotToggle
                  value={values[it.key] ?? null}
                  onChange={(v) => setVal(it.key, v)}
                  showSc={!!it.sc}
                  sc={!!sc[it.key]}
                  onScChange={(v) => setScFor(it.key, v)}
                  size="sm"
                />
              </InspectionRow>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Lamps</FieldLabel>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {LAMPS.map((l) => {
              const v = lamps[l];
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLamp(l, v === "ok" ? "not" : v === "not" ? null : "ok")}
                  className={cn(
                    "flex min-h-tap flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 text-[11px] font-semibold transition-colors",
                    v === "ok" && "border-emerald-500/50 bg-emerald-500/15 text-emerald-500",
                    v === "not" && "border-primary bg-primary/15 text-primary",
                    !v && "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  <span>{l}</span>
                  <span className="text-[9px] opacity-70">
                    {v === "ok" ? "OK" : v === "not" ? "NOT" : "–"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Electrical & Wiper</FieldLabel>
          <div className="mt-2 divide-y divide-border/40">
            {ELECTRICAL.map((it) => (
              <InspectionRow key={it.key} label={it.label}>
                <OkNotToggle
                  value={values[it.key] ?? null}
                  onChange={(v) => setVal(it.key, v)}
                  showSc={!!it.sc}
                  sc={!!sc[it.key]}
                  onScChange={(v) => setScFor(it.key, v)}
                  size="sm"
                />
              </InspectionRow>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Service Lainnya</FieldLabel>
          <Textarea placeholder="Temuan tambahan di area engine/brake/fluid…" className="min-h-[70px] bg-background" />
        </div>
      </div>
    </CanvasSection>
  );
}