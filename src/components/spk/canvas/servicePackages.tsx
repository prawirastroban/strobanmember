// Shared constants & UI atoms untuk pemilihan Paket / Service Order.
// Dipakai oleh intake (`/spk/new`) dan Canvas Section 4 (`ServiceOrderCard`).
import { cn } from "@/lib/utils";

export const SERVICE_UMUM: Array<{
  key: string;
  label: string;
  hasQty?: boolean;
  qtyUnit?: string;
  tuneUp?: boolean;
}> = [
  { key: "ganti_oli", label: "Ganti Oli", hasQty: true, qtyUnit: "L" },
  { key: "tune_up", label: "Tune Up", tuneUp: true },
  { key: "kaki_kaki", label: "Kaki-kaki" },
  { key: "spooring", label: "Spooring" },
  { key: "balancing", label: "Balancing" },
  { key: "oil_filter", label: "Oil Filter" },
  { key: "cuci_darah", label: "Cuci Darah Mobil" },
  { key: "service_ac", label: "Service AC" },
  { key: "brake_service", label: "Brake Service" },
  { key: "safety_check", label: "Safety Check" },
];

export const PACKAGES_PETROL = ["Bronze", "Silver", "Gold", "Diamond", "Promo Khusus"];
export const PACKAGES_DIESEL = ["Endurance", "Full Pow"];
export const AC_PACKAGE = ["Polar", "Orca", "Small", "Medium", "Large"];

export function PackageGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? null : o)}
              className={cn(
                "min-h-tap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                on
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}