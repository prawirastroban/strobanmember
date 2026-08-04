// Kartu kendaraan tersimpan (dipakai di form keluhan beranda).
import { Star, Plus, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { VehicleAIHealthBadge } from "@/components/vehicle/VehicleAIHealthSummary";
import type { VehicleHealthEntry } from "@/hooks/useVehicleHealthReports";

const DEFAULT_CAR_IMG =
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=250&fit=crop";

export interface SavedVehicleCardData {
  id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  transmission: string | null;
  fuel_type?: string | null;
  tire_size?: string | null;
  image_url?: string | null;
  license_plate: string | null;
  is_default: boolean | null;
}

interface Props {
  vehicle: SavedVehicleCardData;
  selected: boolean;
  onSelect: () => void;
  health?: VehicleHealthEntry | null;
}

export function SavedVehicleCard({ vehicle: v, selected, onSelect, health }: Props) {
  const specs = [v.transmission, v.fuel_type, v.tire_size].filter(Boolean) as string[];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "shrink-0 w-[260px] overflow-hidden rounded-2xl border bg-card text-left transition-all",
        selected ? "border-primary ring-2 ring-primary/40" : "border-border",
      )}
    >
      <div className="relative h-[104px] overflow-hidden">
        <img
          src={v.image_url || DEFAULT_CAR_IMG}
          alt={`${v.brand ?? ""} ${v.model ?? ""}`.trim() || "Kendaraan"}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {v.is_default && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            <Star className="h-2.5 w-2.5 fill-current" /> Utama
          </span>
        )}
        <div className="absolute bottom-2 left-2.5 right-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">
              {[v.brand, v.model].filter(Boolean).join(" ") || "Kendaraan"}
            </p>
            {v.year && <p className="text-[11px] text-white/80 leading-tight">{v.year}</p>}
          </div>
          {v.license_plate && (
            <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
              {v.license_plate}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 overflow-hidden px-2.5 py-2">
        {health && <VehicleAIHealthBadge entry={health} className="shrink-0" />}
        <span className="truncate text-[11px] text-muted-foreground">{specs.join(" • ")}</span>
      </div>
    </button>
  );
}

export function AddOtherVehicleCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "shrink-0 w-[140px] rounded-2xl border border-dashed bg-card/50 px-3 py-4 text-center transition-all",
        selected ? "border-primary text-primary ring-2 ring-primary/30" : "border-border text-muted-foreground",
      )}
    >
      <span className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <Plus className="h-4 w-4" />
      </span>
      <span className="block text-[11px] font-semibold">Kendaraan lain</span>
      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] opacity-80">
        <Car className="h-3 w-3" /> isi manual
      </span>
    </button>
  );
}