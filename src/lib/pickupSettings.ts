import { supabase } from "@/integrations/supabase/client";

export interface PickupSettings {
  enabled: boolean;
  max_distance_km: number;
  base_fee: number;
  return_fee: number;
  fee_mode: "flat" | "per_km";
  pickup_per_km_fee: number;
  return_per_km_fee: number;
  min_pickup_fee: number;
  min_return_fee: number;
}

export const DEFAULT_PICKUP_SETTINGS: PickupSettings = {
  enabled: true,
  max_distance_km: 15,
  base_fee: 75000,
  return_fee: 50000,
  fee_mode: "flat",
  pickup_per_km_fee: 0,
  return_per_km_fee: 0,
  min_pickup_fee: 0,
  min_return_fee: 0,
};

export async function fetchPickupSettings(): Promise<PickupSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "pickup_service")
    .maybeSingle();
  if (!data?.value) return DEFAULT_PICKUP_SETTINGS;
  return { ...DEFAULT_PICKUP_SETTINGS, ...(data.value as Partial<PickupSettings>) };
}

export function calcPickupFee(s: PickupSettings, withReturn: boolean): number {
  if (!s.enabled) return 0;
  return s.base_fee + (withReturn ? s.return_fee : 0);
}

/**
 * Hitung biaya jemput & antar pulang berdasarkan mode tarif.
 * - flat: pakai base_fee + return_fee
 * - per_km: distanceKm * tarif/km, dengan tarif minimum
 */
export function calcPickupFees(
  s: PickupSettings,
  distanceKm: number,
  withReturn: boolean,
): { pickupFee: number; returnFee: number } {
  if (!s.enabled) return { pickupFee: 0, returnFee: 0 };
  const d = Math.max(0, distanceKm || 0);
  if (s.fee_mode === "per_km") {
    const rawPickup = Math.round(d * (s.pickup_per_km_fee || 0));
    const pickupFee = Math.max(s.min_pickup_fee || 0, rawPickup);
    const rawReturn = Math.round(d * (s.return_per_km_fee || 0));
    const returnFee = withReturn ? Math.max(s.min_return_fee || 0, rawReturn) : 0;
    return { pickupFee, returnFee };
  }
  return {
    pickupFee: s.base_fee || 0,
    returnFee: withReturn ? s.return_fee || 0 : 0,
  };
}

export const PICKUP_STATUS_FLOW = [
  { value: "idle", label: "Belum Dijemput" },
  { value: "dispatched", label: "Driver Berangkat" },
  { value: "arrived", label: "Tiba di Lokasi" },
  { value: "car_picked", label: "Mobil Dijemput" },
  { value: "at_workshop", label: "Tiba di Bengkel" },
  { value: "returning", label: "Mengantar Pulang" },
  { value: "returned", label: "Selesai Diantar" },
] as const;

export type PickupStatus = (typeof PICKUP_STATUS_FLOW)[number]["value"];

export const PICKUP_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  PICKUP_STATUS_FLOW.map((s) => [s.value, s.label]),
);