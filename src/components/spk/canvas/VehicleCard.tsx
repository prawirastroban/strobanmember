// Phase 5.3 — Vehicle Information (Merk, Tipe, Tahun, No. Pol., Mileage).
import { Input } from "@/components/ui/input";
import { CanvasSection, FieldLabel } from "./CanvasSection";

interface VehicleCardProps {
  merk: string;
  tipe: string;
  tahun: string;
  plate: string;
  mileageNow: string;
  mileageNext: string;
}

export function VehicleCard(props: VehicleCardProps) {
  return (
    <CanvasSection index={3} title="Vehicle Information" role="sa">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Merk Mobil" defaultValue={props.merk} />
        <Field label="Tipe Mobil" defaultValue={props.tipe} />
        <Field label="Tahun" defaultValue={props.tahun} inputMode="numeric" />
        <Field label="No. Polisi" defaultValue={props.plate} className="uppercase" />
        <Field label="Mileage Now (km)" defaultValue={props.mileageNow} inputMode="numeric" />
        <Field label="Mileage Next (km)" defaultValue={props.mileageNext} inputMode="numeric" />
      </div>
    </CanvasSection>
  );
}

function Field({
  label,
  defaultValue,
  inputMode,
  className,
}: {
  label: string;
  defaultValue: string;
  inputMode?: "numeric" | "tel" | "text";
  className?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Input
        defaultValue={defaultValue}
        inputMode={inputMode}
        className={`h-11 ${className ?? ""}`}
      />
    </div>
  );
}