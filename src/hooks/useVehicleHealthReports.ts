// Membaca laporan kesehatan AI (spk_orders.ai_health_report) milik user login.
// Read-only. Dipakai di Riwayat Perawatan, Pengingat Servis, dan Data Kendaraan.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AIHealthReport {
  overall_status: "Excellent" | "Good" | "Needs Attention" | "Critical" | string;
  score: number;
  summary: string;
  findings: string[];
  recommendations: string[];
  next_service_km?: number | null;
  generated_at?: string;
}

export interface VehicleHealthEntry {
  spkId: string;
  spkNumber: string;
  vehicleId: string | null;
  plate: string | null;
  report: AIHealthReport;
  at: string;
}

const normalizePlate = (v: unknown) =>
  typeof v === "string" ? v.replace(/\s|-/g, "").toUpperCase() : null;

function toReport(raw: any): AIHealthReport | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    overall_status: raw.overall_status ?? "Good",
    score: Number(raw.score) || 0,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    findings: Array.isArray(raw.findings) ? raw.findings.filter((x: unknown) => typeof x === "string") : [],
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.filter((x: unknown) => typeof x === "string")
      : [],
    next_service_km: raw.next_service_km ?? null,
    generated_at: raw.generated_at ?? undefined,
  };
}

export function useVehicleHealthReports() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<VehicleHealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("spk_orders")
      .select("id,spk_number,vehicle_id,ai_health_report,data,closed_at,updated_at,opened_at")
      .eq("customer_id", user.id)
      .is("deleted_at", null)
      .eq("status", "closed")
      .not("ai_health_report", "is", null)
      .order("updated_at", { ascending: false })
      .limit(50);

    const rows = (data ?? []) as any[];
    setEntries(
      rows
        .map((r) => {
          const report = toReport(r.ai_health_report);
          if (!report) return null;
          const d = (r.data ?? {}) as Record<string, unknown>;
          return {
            spkId: r.id,
            spkNumber: r.spk_number,
            vehicleId: r.vehicle_id ?? null,
            plate: normalizePlate(d.plate ?? d.license_plate ?? d.vehicle_plate ?? d.no_polisi),
            report,
            at: r.closed_at ?? r.updated_at ?? r.opened_at,
          } as VehicleHealthEntry;
        })
        .filter(Boolean) as VehicleHealthEntry[],
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /** Laporan terbaru per kendaraan (id kendaraan atau plat sebagai cadangan). */
  const byVehicleId = useMemo(() => {
    const map = new Map<string, VehicleHealthEntry>();
    for (const e of entries) if (e.vehicleId && !map.has(e.vehicleId)) map.set(e.vehicleId, e);
    return map;
  }, [entries]);

  const byPlate = useMemo(() => {
    const map = new Map<string, VehicleHealthEntry>();
    for (const e of entries) if (e.plate && !map.has(e.plate)) map.set(e.plate, e);
    return map;
  }, [entries]);

  const findFor = useCallback(
    (vehicleId?: string | null, plate?: string | null) => {
      if (vehicleId && byVehicleId.has(vehicleId)) return byVehicleId.get(vehicleId)!;
      const p = normalizePlate(plate);
      if (p && byPlate.has(p)) return byPlate.get(p)!;
      return null;
    },
    [byVehicleId, byPlate],
  );

  const latest = entries[0] ?? null;

  return { entries, latest, loading, findFor, reload: load };
}
