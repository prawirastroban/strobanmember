// Read-only Vehicle Health badge. Consumes the pure interpreter — no data fetching.
import { cn } from "@/lib/utils";
import {
  computeVehicleHealth,
  VEHICLE_HEALTH_COLORS,
  type VehicleHealthInput,
} from "@/lib/spk/vehicleHealth";

interface Props extends VehicleHealthInput {
  className?: string;
  showReason?: boolean;
}

export function VehicleHealthBadge({ className, showReason, ...input }: Props) {
  const result = computeVehicleHealth(input);
  const colors = VEHICLE_HEALTH_COLORS[result.status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        colors.badge,
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", colors.dot)} />
      <span>{result.label}</span>
      {showReason && (
        <span className="ml-1 font-normal opacity-80">· {result.reason}</span>
      )}
    </span>
  );
}