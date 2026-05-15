import { useEffect, useState } from "react";
import { Truck, Building2, MapPin, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchPickupSettings,
  calcPickupFee,
  type PickupSettings,
  DEFAULT_PICKUP_SETTINGS,
} from "@/lib/pickupSettings";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export interface PickupValue {
  serviceLocation: "workshop" | "pickup";
  address: string;
  distanceKm: string; // keep as string for input handling
  withReturn: boolean;
  pickupFee: number;
  returnFee: number;
  isValid: boolean;
  enabled: boolean;
}

interface Props {
  value: PickupValue;
  onChange: (v: PickupValue) => void;
  compact?: boolean;
}

export const buildInitialPickupValue = (): PickupValue => ({
  serviceLocation: "workshop",
  address: "",
  distanceKm: "",
  withReturn: false,
  pickupFee: 0,
  returnFee: 0,
  isValid: true,
  enabled: true,
});

export default function PickupLocationSection({ value, onChange, compact }: Props) {
  const [settings, setSettings] = useState<PickupSettings>(DEFAULT_PICKUP_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchPickupSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
      // propagate enabled flag
      onChange({ ...value, enabled: s.enabled });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<PickupValue>) => {
    const next = { ...value, ...patch };
    if (next.serviceLocation === "pickup") {
      next.pickupFee = settings.base_fee;
      next.returnFee = next.withReturn ? settings.return_fee : 0;
      const dist = parseFloat(next.distanceKm || "0");
      const distOK = !!next.distanceKm && !isNaN(dist) && dist > 0 && dist <= settings.max_distance_km;
      const addrOK = next.address.trim().length >= 10;
      next.isValid = distOK && addrOK;
    } else {
      next.pickupFee = 0;
      next.returnFee = 0;
      next.isValid = true;
    }
    onChange(next);
  };

  if (loaded && !settings.enabled) return null;

  const isPickup = value.serviceLocation === "pickup";
  const dist = parseFloat(value.distanceKm || "0");
  const overLimit = isPickup && !!value.distanceKm && !isNaN(dist) && dist > settings.max_distance_km;

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-3 space-y-3", compact && "p-3")}>
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <MapPin className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-semibold leading-none">Lokasi Servis</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pilih datang ke bengkel atau dijemput dari lokasi Anda
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => update({ serviceLocation: "workshop" })}
          className={cn(
            "rounded-xl border p-3 text-left transition-all flex items-start gap-2",
            !isPickup
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border/60 hover:border-border bg-muted/20"
          )}
        >
          <Building2 className={cn("h-4 w-4 shrink-0 mt-0.5", !isPickup ? "text-primary" : "text-muted-foreground")} />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">Datang ke Bengkel</span>
            <span className="block text-[10.5px] text-muted-foreground leading-snug">Tanpa biaya tambahan</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => update({ serviceLocation: "pickup" })}
          className={cn(
            "rounded-xl border p-3 text-left transition-all flex items-start gap-2",
            isPickup
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border/60 hover:border-border bg-muted/20"
          )}
        >
          <Truck className={cn("h-4 w-4 shrink-0 mt-0.5", isPickup ? "text-primary" : "text-muted-foreground")} />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">Pick-up Service</span>
            <span className="block text-[10.5px] text-muted-foreground leading-snug">
              {formatIDR(settings.base_fee)} • max {settings.max_distance_km} km
            </span>
          </span>
        </button>
      </div>

      {/* Pickup details */}
      {isPickup && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">
              Alamat lengkap penjemputan
            </label>
            <Textarea
              value={value.address}
              onChange={(e) => update({ address: e.target.value.slice(0, 500) })}
              placeholder="Contoh: Jl. Merdeka No. 12, RT 03/04, Sukajadi, Bandung — patokan: depan Indomaret"
              className="mt-1 min-h-[70px] resize-none text-[13px] rounded-xl bg-muted/30 border-border/60"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Estimasi jarak (km)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={value.distanceKm}
                onChange={(e) => update({ distanceKm: e.target.value })}
                placeholder="contoh: 8"
                className={cn("mt-1 h-10 rounded-xl text-[13px]", overLimit && "border-destructive")}
              />
            </div>
            <label className="flex items-end gap-2 cursor-pointer pb-0.5">
              <input
                type="checkbox"
                checked={value.withReturn}
                onChange={(e) => update({ withReturn: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-[12px] text-foreground leading-tight">
                Antar pulang setelah selesai
                <span className="block text-[10px] text-muted-foreground">
                  +{formatIDR(settings.return_fee)}
                </span>
              </span>
            </label>
          </div>

          {overLimit && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11.5px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Lokasi di luar area pick-up. Maksimum {settings.max_distance_km} km dari cabang.</span>
            </div>
          )}

          <div className="rounded-xl bg-muted/40 border border-border/40 p-2.5 text-[12px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya jemput</span>
              <span className="font-medium tabular-nums">{formatIDR(value.pickupFee)}</span>
            </div>
            {value.withReturn && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Biaya antar pulang</span>
                <span className="font-medium tabular-nums">{formatIDR(value.returnFee)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}