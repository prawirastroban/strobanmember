// Phase 5.3 — Engine / Brake / Fluid Check + Lamps + Electrical (paper section).
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { InspectionRowBound } from "./InspectionRowBound";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";
import type { OkNotValue } from "./OkNotToggle";

const ENGINE_ITEMS: { code: string; label: string; sc?: boolean }[] = [
  { code: "engine_oil", label: "Engine Oil", sc: true },
  { code: "brake_fluid", label: "Brake Fluid", sc: true },
  { code: "spark_plug", label: "Spark Plug" },
  { code: "packing_seal", label: "Packing Seal", sc: true },
  { code: "power_steering_fluid", label: "Power Steering Fluid" },
  { code: "coolant", label: "Coolant", sc: true },
  { code: "transmission_fluid", label: "Transmission Fluid" },
  { code: "matic_transmission", label: "Matic Transmision" },
  { code: "diff_gear_oil", label: "Differential Gear Oil" },
  { code: "brake_pad_front", label: "Brake Pad — Front", sc: true },
  { code: "brake_pad_rear", label: "Brake Pad — Rear", sc: true },
  { code: "v_belt", label: "V-Belt", sc: true },
  { code: "brake_cylinder", label: "Brake Cylinder" },
  { code: "brake_calipers", label: "Brake Calipers" },
];

const LAMPS: { code: string; label: string }[] = [
  { code: "lamp_head", label: "Head" },
  { code: "lamp_fog", label: "Fog" },
  { code: "lamp_side", label: "Side" },
  { code: "lamp_rear", label: "Rear" },
  { code: "lamp_brake", label: "Brake" },
];

const ELECTRICAL: { code: string; label: string; sc?: boolean }[] = [
  { code: "wiper_blades", label: "Wiper Blades", sc: true },
  { code: "wiper_fluid", label: "Wiper Fluid", sc: true },
  { code: "battery", label: "Battery", sc: true },
  { code: "alternator", label: "Alternator" },
];

export function InspectionEngineCard() {
  const section = useSectionBinding("engine");
  const [others, setOthers, othersMeta] = useBinding<string>("engine_service_lainnya", "");
  if (!section.visible) return null;
  return (
    <CanvasSection index={8} title="Engine / Brake / Fluid Check" role="mechanic" id="sec-engine">
      <div className="space-y-5">
        <div>
          <FieldLabel>Engine · Brake · Fluid</FieldLabel>
          <div className="mt-2 divide-y divide-border/40">
            {ENGINE_ITEMS.map((it) => (
              <InspectionRowBound
                key={it.code}
                label={it.label}
                code={it.code}
                showSc={!!it.sc}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Lamps</FieldLabel>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {LAMPS.map((l) => (
              <LampButton key={l.code} code={l.code} label={l.label} />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Electrical & Wiper</FieldLabel>
          <div className="mt-2 divide-y divide-border/40">
            {ELECTRICAL.map((it) => (
              <InspectionRowBound
                key={it.code}
                label={it.label}
                code={it.code}
                showSc={!!it.sc}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5" data-field="engine_service_lainnya">
          <FieldLabel>Service Lainnya</FieldLabel>
          <Textarea
            value={others}
            onChange={(e) => setOthers(e.target.value)}
            disabled={othersMeta.disabled}
            placeholder="Temuan tambahan di area engine/brake/fluid…"
            className="min-h-[70px] bg-background"
          />
        </div>
      </div>
    </CanvasSection>
  );
}

function LampButton({ code, label }: { code: string; label: string }) {
  const [v, setV, meta] = useBinding<OkNotValue>(code, null);
  if (!meta.visible) return null;
  const cycle = () => setV(v === "ok" ? "not" : v === "not" ? null : "ok");
  return (
    <button
      type="button"
      onClick={cycle}
      disabled={meta.disabled}
      data-field={code}
      className={cn(
        "flex min-h-tap flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 text-[11px] font-semibold transition-colors",
        v === "ok" && "border-emerald-500/50 bg-emerald-500/15 text-emerald-500",
        v === "not" && "border-primary bg-primary/15 text-primary",
        !v && "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span className="text-[9px] opacity-70">
        {v === "ok" ? "OK" : v === "not" ? "NOT" : "–"}
      </span>
    </button>
  );
}