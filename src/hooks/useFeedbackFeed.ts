import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  scoreComplaint, scoreInternal, scoreReview, scorePaymentAnomaly,
  scoreBookingStuck, sortByPriority, UnifiedItem,
} from "@/lib/feedbackPriority";

export function useFeedbackFeed() {
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [complaintsRes, internalsRes, reviewsRes, paymentsRes, bookingsRes] = await Promise.all([
      supabase.from("customer_complaints" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("internal_reports" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("booking_reviews" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("payments" as any).select("*").in("payment_status", ["pending", "failure", "failed"]).order("created_at", { ascending: false }).limit(200),
      supabase.from("bookings" as any).select("id,user_id,customer_name,service_name,status,branch,updated_at,created_at").not("status", "in", "(completed,cancelled,done)").order("updated_at", { ascending: false }).limit(200),
    ]);

    // Count complaint repeats per user (7d)
    const weekAgo = Date.now() - 7 * 86400000;
    const repeatCount = new Map<string, number>();
    (complaintsRes.data || []).forEach((c: any) => {
      if (c.user_id && new Date(c.created_at).getTime() > weekAgo) {
        repeatCount.set(c.user_id, (repeatCount.get(c.user_id) || 0) + 1);
      }
    });

    const merged: UnifiedItem[] = [];
    (complaintsRes.data || []).forEach((c: any) =>
      merged.push(scoreComplaint(c, c.user_id ? repeatCount.get(c.user_id) || 1 : 1)),
    );
    (internalsRes.data || []).forEach((r: any) => merged.push(scoreInternal(r)));
    (reviewsRes.data || []).forEach((rv: any) => merged.push(scoreReview(rv)));
    (paymentsRes.data || []).forEach((p: any) => {
      const it = scorePaymentAnomaly(p); if (it) merged.push(it);
    });
    (bookingsRes.data || []).forEach((b: any) => {
      const it = scoreBookingStuck(b); if (it) merged.push(it);
    });

    setItems(sortByPriority(merged));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("feedback-hub")
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_complaints" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_reports" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_reviews" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const kpi = useMemo(() => {
    const open = items.filter((i) => i.status !== "resolved" && i.status !== "fixed" && i.status !== "completed");
    return {
      kritis: open.filter((i) => i.priority === "kritis").length,
      tinggi: open.filter((i) => i.priority === "tinggi").length,
      open: open.length,
      total: items.length,
    };
  }, [items]);

  return { items, loading, kpi, refresh: fetchAll };
}