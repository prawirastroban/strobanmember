// SPK Intelligence Suite — Vehicle Health list.
// Pure interpretation over closed SPK inspection data. No new module.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { VehicleHealthBadge } from "@/components/spk/VehicleHealthBadge";

interface Row {
  id: string;
  spk_number: string;
  vehicle_id: string | null;
  data: unknown;
  notes: string | null;
  closed_at: string | null;
}

function tallyInspection(data: unknown) {
  // Best-effort scan over spk_orders.data for OK/NOT/NA markers.
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

export default function SPKVehicleHealthPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, vehicle_id, data, notes, closed_at")
        .in("status", ["closed", "invoice_paid", "qc_passed", "work_completed"])
        .order("closed_at", { ascending: false, nullsFirst: false })
        .limit(50);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Interpretasi kondisi kendaraan dari hasil inspeksi SPK yang telah selesai. Tidak ada AI, tidak ada prediksi.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Belum ada SPK selesai.</p>
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => {
            const t = tallyInspection(r.data);
            return (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{r.spk_number}</p>
                    <p className="text-xs text-muted-foreground">
                      OK: {t.ok} · NOT: {t.not} · NA: {t.na}
                      {r.closed_at ? ` · ${new Date(r.closed_at).toLocaleDateString("id-ID")}` : ""}
                    </p>
                  </div>
                  <VehicleHealthBadge
                    okCount={t.ok} notCount={t.not} naCount={t.na}
                    mechanicNotes={r.notes} showReason
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
