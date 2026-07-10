// SPK Intelligence Suite — Customer Vehicle Summary
// Composes Vehicle Health + Service Reminder + Recent Repairs + Timeline
// for a single vehicle. All from existing SPK data.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { VehicleHealthBadge } from "@/components/spk/VehicleHealthBadge";
import { computeServiceReminder, REMINDER_COLORS } from "@/lib/spk/serviceReminder";
import OperationalTimeline from "@/components/spk/OperationalTimeline";
import { cn } from "@/lib/utils";

interface SPK {
  id: string; spk_number: string; status: string; data: unknown;
  notes: string | null; closed_at: string | null; created_at: string;
  vehicle_id: string | null; customer_id: string | null;
}

function tally(data: unknown) {
  let ok = 0, not = 0, na = 0;
  const walk = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") {
      const s = v.toUpperCase();
      if (s === "OK") ok++;
      else if (s === "NOT" || s === "NOT_OK" || s === "NOK") not++;
      else if (s === "NA" || s === "N/A") na++;
      return;
    }
    if (typeof v === "object") for (const k of Object.keys(v as object)) walk((v as Record<string, unknown>)[k]);
  };
  walk(data);
  return { ok, not, na };
}
function readMileage(data: unknown): number | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const m = d.mileage ?? d.km ?? d.odometer;
  const n = Number(m); return Number.isFinite(n) ? n : null;
}

export default function SPKCustomerSummaryPage() {
  const [params, setParams] = useSearchParams();
  const vehicleId = params.get("vehicle") ?? "";
  const [input, setInput] = useState(vehicleId);
  const [rows, setRows] = useState<SPK[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, status, data, notes, closed_at, created_at, vehicle_id, customer_id")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(20);
      setRows((data ?? []) as SPK[]);
      setLoading(false);
    })();
  }, [vehicleId]);

  const latest = rows[0];
  const lastClosed = rows.find((r) => r.status === "closed" && r.closed_at);
  const health = useMemo(() => (latest ? tally(latest.data) : { ok: 0, not: 0, na: 0 }), [latest]);
  const reminder = useMemo(
    () => computeServiceReminder({
      lastServiceAt: lastClosed?.closed_at ?? null,
      lastMileage: readMileage(lastClosed?.data),
    }),
    [lastClosed],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <Input
            placeholder="Vehicle ID (UUID)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setParams({ vehicle: input }); }}
            className="flex-1"
          />
          <button
            className="text-xs rounded-md border px-3 py-2 hover:bg-muted"
            onClick={() => setParams({ vehicle: input })}
          >Lihat</button>
        </CardContent>
      </Card>

      {!vehicleId ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Masukkan Vehicle ID untuk melihat ringkasan.</p>
      ) : loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Tidak ada SPK untuk kendaraan ini.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Health</CardTitle></CardHeader>
              <CardContent>
                <VehicleHealthBadge
                  okCount={health.ok} notCount={health.not} naCount={health.na}
                  mechanicNotes={latest?.notes} showReason
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Last Service</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {lastClosed?.closed_at
                  ? new Date(lastClosed.closed_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
                  : "—"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Next Service</CardTitle></CardHeader>
              <CardContent>
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase",
                  REMINDER_COLORS[reminder.status],
                )}>
                  {reminder.status.replace("_", " ")}
                </span>
                <p className="text-xs text-muted-foreground mt-1">{reminder.reason}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Repairs</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {rows.slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                  <span className="truncate">{r.spk_number}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("id-ID")} · {r.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {latest && (
            <OperationalTimeline spkId={latest.id} />
          )}
        </>
      )}
    </div>
  );
}
