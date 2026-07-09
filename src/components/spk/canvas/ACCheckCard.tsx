// Phase 5.3 — AC Checking (12 items + remarks).
import { useState } from "react";
import { CanvasSection, FieldLabel, InspectionRow } from "./CanvasSection";
import { OkNotToggle, type OkNotValue } from "./OkNotToggle";
import { Textarea } from "@/components/ui/textarea";

const AC_ITEMS = [
  "Compressor",
  "Magnetic Clutch",
  "Condensor",
  "Pipe",
  "Switch",
  "Compressor Oil",
  "Evaporator",
  "Motor Fan",
  "Blower",
  "Automatic",
  "Cabin Air Filter",
  "High Pressure",
  "Low Pressure",
];

export function ACCheckCard() {
  const [values, setValues] = useState<Record<string, OkNotValue>>({});
  return (
    <CanvasSection index={8} title="AC Check" role="mechanic">
      <div className="divide-y divide-border/40">
        {AC_ITEMS.map((it) => (
          <InspectionRow key={it} label={it}>
            <OkNotToggle
              value={values[it] ?? null}
              onChange={(v) => setValues((s) => ({ ...s, [it]: v }))}
              size="sm"
            />
          </InspectionRow>
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        <FieldLabel>Other Remarks</FieldLabel>
        <Textarea
          placeholder="Catatan tambahan pengecekan AC…"
          className="min-h-[70px] bg-background"
        />
      </div>
    </CanvasSection>
  );
}