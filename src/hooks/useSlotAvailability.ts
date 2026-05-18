import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type SlotInfo = {
  time: string;
  status: "available" | "full" | "closed";
  booked: number;
  max: number;
  remaining: number;
  effectiveMax: number;
};

const DEFAULT_CAPACITY = 3;

/**
 * Loads slot capacity & booking counts for a given branch + date,
 * subscribes to realtime updates on bookings + booking_slots.
 */
export function useSlotAvailability(
  branch: string | null,
  date: Date | null,
  timeSlots: string[]
) {
  const [slots, setSlots] = useState<Record<string, SlotInfo>>({});
  const [loading, setLoading] = useState(false);

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;

  const load = async () => {
    if (!branch || !dateStr) {
      setSlots({});
      return;
    }
    setLoading(true);
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        supabase
          .from("booking_slots")
          .select("slot_time, max_capacity, status")
          .eq("branch", branch)
          .eq("slot_date", dateStr),
        supabase
          .from("bookings")
          .select("booking_time, status")
          .eq("branch", branch)
          .eq("booking_date", dateStr)
          .neq("status", "cancelled"),
      ]);

      const slotMap = new Map<string, { max: number; status: string }>();
      (slotsRes.data ?? []).forEach((s: any) => {
        slotMap.set(s.slot_time, { max: s.max_capacity, status: s.status });
      });

      const counts = new Map<string, number>();
      (bookingsRes.data ?? []).forEach((b: any) => {
        counts.set(b.booking_time, (counts.get(b.booking_time) ?? 0) + 1);
      });

      const result: Record<string, SlotInfo> = {};
      for (const t of timeSlots) {
        const cfg = slotMap.get(t);
        const max = cfg?.max ?? DEFAULT_CAPACITY;
        const booked = counts.get(t) ?? 0;
        let status: SlotInfo["status"] = "available";
        if (cfg?.status === "closed") status = "closed";
        else if (booked >= max) status = "full";
        result[t] = {
          time: t,
          status,
          booked,
          max,
          remaining: Math.max(0, max - booked),
          effectiveMax: status === "closed" ? 0 : max,
        };
      }
      setSlots(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branch, dateStr, timeSlots.join(",")]);

  // Realtime
  useEffect(() => {
    if (!branch || !dateStr) return;
    const channel = supabase
      .channel(`slot-${branch}-${dateStr}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_slots", filter: `branch=eq.${branch}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `branch=eq.${branch}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [branch, dateStr]);

  return { slots, loading, refresh: load };
}
