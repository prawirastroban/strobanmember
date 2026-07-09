// Phase 5.3 — Suspension System + Part Replacement (part of Inspection Checklist).
import { useState } from "react";
import { CanvasSection, FieldLabel, InspectionRow } from "./CanvasSection";
import { OkNotToggle, type OkNotValue } from "./OkNotToggle";
import { Textarea } from "@/components/ui/textarea";

const SUSPENSION = [
  { key: "wheel_bearing", label: "Wheel Bearing" },
  { key: "control_arm", label: "Control Arm" },
  { key: "ball_joint", label: "Ball Joint" },
  { key: "shock_absorber", label: "Shock Absorber" },
];

export function InspectionSuspensionCard() {
  const [values, setValues] = useState<Record<string, OkNotValue>>({});
  return (
    <CanvasSection index={6} title="Inspection Checklist — Suspension" role="mechanic">
      <div className="space-y-4">
        <div className="divide-y divide-border/40">
          {SUSPENSION.map((it) => (
            <InspectionRow key={it.key} label={it.label}>
              <OkNotToggle
                value={values[it.key] ?? null}
                onChange={(v) => setValues((s) => ({ ...s, [it.key]: v }))}
                size="sm"
              />
            </InspectionRow>
          ))}
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Part Replacement</FieldLabel>
          <Textarea
            placeholder="Part yang harus diganti (nama, jumlah, catatan)…"
            className="min-h-[80px] bg-background"
          />
        </div>
      </div>
    </CanvasSection>
  );
}