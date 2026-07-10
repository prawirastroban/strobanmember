// Customer-side SPK preview inside MyBooking.
// Shows SPK number, status, AI health summary and a print link.
// Read-only for customers. Only renders when a linked SPK exists.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Wrench, ArrowRight, Sparkles } from "lucide-react";

export default function CustomerSPKCard({ bookingId }: { bookingId: string }) {
  const [spk, setSpk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, status, ai_health_report, opened_at")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (!cancelled) { setSpk(data); setLoading(false); }
    })();

    const channel = supabase
      .channel(`spk-customer-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "spk_orders", filter: `booking_id=eq.${bookingId}` },
        (payload) => { setSpk(payload.new ?? null); })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [bookingId]);

  if (loading || !spk) return null;

  const health = spk.ai_health_report as any;

  return (
    <Link
      to={`/spk/${spk.id}/print`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">SPK {spk.spk_number}</p>
            <Badge variant="outline" className="text-[10px] uppercase">{spk.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Servis dimulai {new Date(spk.opened_at).toLocaleString("id-ID")}
          </p>
          {health && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 text-[11px]">
                <span className="font-semibold">Kesehatan: {health.overall_status}</span>
                {health.summary && <span className="text-muted-foreground"> — {health.summary}</span>}
              </div>
            </div>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </Link>
  );
}