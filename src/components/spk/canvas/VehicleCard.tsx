// Phase 5.3 — Vehicle Information (Merk, Tipe, Tahun, No. Pol., Mileage).
import { Input } from "@/components/ui/input";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { useBinding, useSectionBinding, type FieldBindingMeta } from "@/hooks/spk/FormRuntimeProvider";
import { cn } from "@/lib/utils";

export function VehicleCard() {
  const section = useSectionBinding("vehicle");
  if (!section.visible) return null;
  return (
    <CanvasSection index={2} title="Vehicle Information" role="sa" required id="sec-vehicle">
      <div className="grid grid-cols-2 gap-3">
        <BoundField code="vehicle_merk" label="Merk Mobil" required />
        <BoundField code="vehicle_tipe" label="Tipe Mobil" required />
        <BoundField code="vehicle_tahun" label="Tahun" inputMode="numeric" />
        <BoundField code="vehicle_plate" label="No. Polisi" className="uppercase" required />
        <BoundField code="vehicle_mileage_now" label="Mileage Now (km)" inputMode="numeric" required />
        <BoundField code="vehicle_mileage_next" label="Mileage Next (km)" inputMode="numeric" />
      </div>
    </CanvasSection>
  );
}

function BoundField({
  code,
  label,
  inputMode,
  className,
  required,
}: {
  code: string;
  label: string;
  inputMode?: "numeric" | "tel" | "text";
  className?: string;
  required?: boolean;
}) {
  const [value, setValue, meta] = useBinding<string>(code, "");
  if (!meta.visible) return null;
  const isReq = required || meta.required;
  return (
    <div className="space-y-1.5" data-field={code}>
      <FieldLabel required={isReq}>{label}</FieldLabel>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={meta.disabled}
        inputMode={inputMode}
        className={cn("h-11", className, meta.error && "border-primary")}
        aria-required={isReq || undefined}
        aria-invalid={!!meta.error}
      />
      {meta.error && <p className="text-[10px] text-primary">{meta.error}</p>}
    </div>
  );
}

// Re-export type so downstream consumers keep working if any exist.
export type { FieldBindingMeta };