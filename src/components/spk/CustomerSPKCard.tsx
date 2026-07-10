// Customer-side SPK preview inside MyBooking.
// Shows SPK number, status, AI health summary and a print link.
// Read-only for customers. Only renders when a linked SPK exists.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Wrench, ArrowRight, Sparkles, BellRing, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerSPKCard({ bookingId }: { bookingId: string }) {
  const [spk, setSpk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // A booking may have multiple SPKs over time (cancelled retries + the
      // active one). Pick the latest non-deleted row so the customer always
      // sees the current SPK — never treat multiple rows as an error.
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, status, ai_health_report, opened_at, booking_id, data, deleted_at, created_at")
        .eq("booking_id", bookingId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled) { setSpk(Array.isArray(data) && data.length ? data[0] : null); setLoading(false); }
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
  const needsApproval = spk.status === "awaiting_customer_approval" && !!spk.booking_id;
  const alreadySigned = !!spk.data?.signature_customer;
  const targetUrl = needsApproval ? `/spk/${spk.id}/approve` : `/spk/${spk.id}/print`;

  return (
    <Link
      to={targetUrl}
      className={cn(
        "block rounded-2xl border bg-card p-4 shadow-sm transition",
        needsApproval
          ? "border-destructive/50 hover:border-destructive animate-pulse-slow"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("rounded-lg p-2", needsApproval ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
          {needsApproval ? <BellRing className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">SPK {spk.spk_number}</p>
            <Badge variant="outline" className="text-[10px] uppercase">{spk.status}</Badge>
            {needsApproval && (
              <Badge className="text-[10px] bg-destructive text-destructive-foreground">Butuh Persetujuan</Badge>
            )}
            {alreadySigned && !needsApproval && (
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">Ditandatangani</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {needsApproval
              ? "Silakan tinjau & tanda tangani SPK Anda."
              : `Servis dimulai ${spk.opened_at ? new Date(spk.opened_at).toLocaleString("id-ID") : "-"}`}
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
          {needsApproval && (
            <div className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground shadow-sm sm:w-auto">
              <PenLine className="h-4 w-4" />
              Approve SPK & Tanda Tangan
            </div>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </Link>
  );
}