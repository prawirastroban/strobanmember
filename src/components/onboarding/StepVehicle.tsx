import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car } from "lucide-react";

export interface VehicleDraft {
  brand: string;
  model: string;
  year: string;
  license_plate: string;
}

interface Props {
  value: VehicleDraft;
  onChange: (v: VehicleDraft) => void;
}

export default function StepVehicle({ value, onChange }: Props) {
  const set = (k: keyof VehicleDraft, v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-full bg-primary/12 flex items-center justify-center shrink-0">
          <Car className="h-5 w-5 text-primary" />
        </span>
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">Data kendaraan Anda</h3>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Agar rekomendasi servis, harga ban, dan riwayat perawatan lebih akurat.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <Label className="text-[11px] text-muted-foreground">Merk</Label>
          <Input
            className="h-11 rounded-xl mt-1 text-sm"
            placeholder="Toyota"
            value={value.brand}
            onChange={(e) => set("brand", e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="col-span-1">
          <Label className="text-[11px] text-muted-foreground">Model</Label>
          <Input
            className="h-11 rounded-xl mt-1 text-sm"
            placeholder="Avanza"
            value={value.model}
            onChange={(e) => set("model", e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="col-span-1">
          <Label className="text-[11px] text-muted-foreground">Tahun</Label>
          <Input
            className="h-11 rounded-xl mt-1 text-sm"
            inputMode="numeric"
            placeholder="2020"
            value={value.year}
            onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        <div className="col-span-1">
          <Label className="text-[11px] text-muted-foreground">Plat nomor</Label>
          <Input
            className="h-11 rounded-xl mt-1 text-sm uppercase"
            placeholder="B 1234 XYZ"
            value={value.license_plate}
            onChange={(e) => set("license_plate", e.target.value.toUpperCase())}
            maxLength={15}
          />
        </div>
      </div>
    </div>
  );
}