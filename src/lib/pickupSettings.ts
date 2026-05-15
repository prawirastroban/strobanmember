import { supabase } from "@/integrations/supabase/client";

export interface PickupSettings {
  enabled: boolean;
  max_distance_km: number;
  base_fee: number;
  return_fee: number;
  fee_mode: "flat" | "per_km";
}

export const DEFAULT_PICKUP_SETTINGS: PickupSettings = {
  enabled: true,
  max_distance_km: 15,
  base_fee: 75000,
  return_fee: 50000,
  fee_mode: "flat",
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