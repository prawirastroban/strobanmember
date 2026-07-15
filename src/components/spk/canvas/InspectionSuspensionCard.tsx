// Phase 5.3 — Suspension System + Part Replacement (part of Inspection Checklist).
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { Textarea } from "@/components/ui/textarea";
import { InspectionRowBound } from "./InspectionRowBound";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";
import { SkipToNextButton } from "./SkipToNextButton";

const SUSPENSION = [
  { code: "insp_suspension_wheel_bearing", label: "Wheel Bearing" },
  { code: "insp_suspension_control_arm", label: "Control Arm" },
  { code: "insp_suspension_ball_joint", label: "Ball Joint" },
  { code: "insp_suspension_shock_absorber", label: "Shock Absorber" },
];

export function InspectionSuspensionCard() {
  const section = useSectionBinding("suspension");
  const [part, setPart, partMeta] = useBinding<string>("insp_suspension_part_replacement", "");
  if (!section.visible) return null;
  return (
    <CanvasSection index={5} title="Inspection Checklist — Suspension" role="mechanic" id="sec-suspension">
      <div className="space-y-4">
        <div className="divide-y divide-border/40">
          {SUSPENSION.map((it) => (
            <InspectionRowBound key={it.code} label={it.label} code={it.code} />
          ))}
        </div>
        <div className="space-y-1.5" data-field="insp_suspension_part_replacement">
          <FieldLabel>Part Replacement</FieldLabel>
          <Textarea
            value={part}
            onChange={(e) => setPart(e.target.value)}
            disabled={partMeta.disabled}
            placeholder="Part yang harus diganti (nama, jumlah, catatan)…"
            className="min-h-[80px] bg-background"
          />
          <SkipToNextButton sectionId="sec-suspension" show={!part.trim()} />
        </div>
      </div>
    </CanvasSection>
  );
}