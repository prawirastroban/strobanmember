// Phase 5.3 — AC Checking (12 items + remarks).
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { Textarea } from "@/components/ui/textarea";
import { InspectionRowBound } from "./InspectionRowBound";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";
import { SkipToNextButton } from "./SkipToNextButton";

const AC_ITEMS: { code: string; label: string }[] = [
  { code: "ac_compressor", label: "Compressor" },
  { code: "ac_magnetic_clutch", label: "Magnetic Clutch" },
  { code: "ac_condensor", label: "Condensor" },
  { code: "ac_pipe", label: "Pipe" },
  { code: "ac_switch", label: "Switch" },
  { code: "ac_compressor_oil", label: "Compressor Oil" },
  { code: "ac_evaporator", label: "Evaporator" },
  { code: "ac_motor_fan", label: "Motor Fan" },
  { code: "ac_blower", label: "Blower" },
  { code: "ac_automatic", label: "Automatic" },
  { code: "ac_cabin_air_filter", label: "Cabin Air Filter" },
  { code: "ac_high_pressure", label: "High Pressure" },
  { code: "ac_low_pressure", label: "Low Pressure" },
];

export function ACCheckCard() {
  const section = useSectionBinding("ac");
  const [remarks, setRemarks, meta] = useBinding<string>("ac_remarks", "");
  if (!section.visible) return null;
  return (
    <CanvasSection index={7} title="AC Check" role="mechanic" id="sec-ac">
      <div className="divide-y divide-border/40">
        {AC_ITEMS.map((it) => (
          <InspectionRowBound key={it.code} label={it.label} code={it.code} />
        ))}
      </div>
      <div className="mt-4 space-y-1.5" data-field="ac_remarks">
        <FieldLabel>Other Remarks</FieldLabel>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={meta.disabled}
          placeholder="Catatan tambahan pengecekan AC…"
          className="min-h-[70px] bg-background"
        />
        <SkipToNextButton sectionId="sec-ac" show={!remarks.trim()} />
      </div>
    </CanvasSection>
  );
}