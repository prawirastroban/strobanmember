// SPK Intelligence Suite — Service Reminder list.
// Uses last closed SPK per vehicle. No new engine.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { computeServiceReminder, REMINDER_COLORS } from "@/lib/spk/serviceReminder";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  spk_number: string;
  vehicle_id: string | null;
  customer_id: string | null;
  data: unknown;
  closed_at: string | null;
}

function readMileage(data: unknown): number | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const m = d.mileage ?? d.km ?? d.odometer ?? (d.vehicle as Record<string, unknown> | undefined)?.mileage;
  const n = Number(m);
  return Number.isFinite(n) ? n : null;
}

export default function SPKServiceReminderPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, vehicle_id, customer_id, data, closed_at")
        .eq("status", "closed")
        .not("closed_at", "is", null)
        .order("closed_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  // last closed per vehicle_id
  const reminders = useMemo(() => {
    const seen = new Set<string>();
    const out: (Row & { rem: ReturnType<typeof computeServiceReminder> })[] = [];
    for (const r of rows) {
      const key = r.vehicle_id ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const rem = computeServiceReminder({
        lastServiceAt: r.closed_at,
        lastMileage: readMileage(r.data),
      });
      out.push({ ...r, rem });
    }
    // Sort: overdue → due_soon → on_track → unknown
    const order = { overdue: 0, due_soon: 1, on_track: 2, unknown: 3 } as const;
    return out.sort((a, b) => order[a.rem.status] - order[b.rem.status]);
  }, [rows]);

  if (loading) return <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pengingat servis diturunkan dari SPK yang telah selesai. Interval default: 90 hari / 5.000 km.
      </p>
      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Belum ada SPK selesai.</p>
      ) : (
        <div className="grid gap-2">
          {reminders.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{r.spk_number}</p>
                  <p className="text-xs text-muted-foreground">{r.rem.reason}</p>
                </div>
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase",
                  REMINDER_COLORS[r.rem.status],
                )}>
                  {r.rem.status.replace("_", " ")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
