import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemStats {
  // operational
  bookingsToday: number;
  bookingsPending: number;
  bookingsActive: number;
  tireOrdersToday: number;
  tireOrdersPending: number;
  // payments
  paymentsTodayCount: number;
  paymentsTodayAmount: number;
  paymentsPendingCount: number;
  paymentsPendingAmount: number;
  // acquisition
  customersToday: number;
  customersTodayBySource: Record<string, number>;
  vehiclesToday: number;
  customersTotal: number;
  // health
  sessionsOnline: number;
  loading: boolean;
  lastUpdated: Date | null;
}

const initial: SystemStats = {
  bookingsToday: 0, bookingsPending: 0, bookingsActive: 0,
  tireOrdersToday: 0, tireOrdersPending: 0,
  paymentsTodayCount: 0, paymentsTodayAmount: 0,
  paymentsPendingCount: 0, paymentsPendingAmount: 0,
  customersToday: 0, customersTodayBySource: {}, vehiclesToday: 0, customersTotal: 0,
  sessionsOnline: 0,
  loading: true, lastUpdated: null,
};

const startOfToday = () => {
  const d = new Date(); d.setHours(0,0,0,0); return d.toISOString();
};
const fiveMinAgo = () => new Date(Date.now() - 5*60_000).toISOString();

export function useSystemDashboardStats() {
  const [stats, setStats] = useState<SystemStats>(initial);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const fetchAll = async () => {
      const today = startOfToday();
      const [
        bToday, bPending, bActive,
        toToday, toPending,
        payToday, payPending,
        custToday, custTotal, vehToday,
        sessions,
      ] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["pending","waiting_confirmation"]),
        supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["in_progress","ready_for_pickup","confirmed"]),
        supabase.from("tire_orders").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("tire_orders").select("id", { count: "exact", head: true }).in("payment_status", ["unpaid","pending"]),
        supabase.from("payments").select("amount").eq("payment_status","paid").gte("created_at", today),
        supabase.from("payments").select("amount").eq("payment_status","pending"),
        supabase.from("profiles").select("acquisition_source").gte("created_at", today),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("app_version_clients").select("user_id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo()),
      ]);

      if (!active) return;

      const sumAmount = (rows: any[] | null) =>
        (rows || []).reduce((s, r) => s + (Number(r?.amount) || 0), 0);

      const bySource: Record<string, number> = {};
      (custToday.data || []).forEach((r: any) => {
        const k = r?.acquisition_source || "direct";
        bySource[k] = (bySource[k] || 0) + 1;
      });

      setStats({
        bookingsToday: bToday.count || 0,
        bookingsPending: bPending.count || 0,
        bookingsActive: bActive.count || 0,
        tireOrdersToday: toToday.count || 0,
        tireOrdersPending: toPending.count || 0,
        paymentsTodayCount: (payToday.data || []).length,
        paymentsTodayAmount: sumAmount(payToday.data),
        paymentsPendingCount: (payPending.data || []).length,
        paymentsPendingAmount: sumAmount(payPending.data),
        customersToday: (custToday.data || []).length,
        customersTodayBySource: bySource,
        vehiclesToday: vehToday.count || 0,
        customersTotal: custTotal.count || 0,
        sessionsOnline: sessions.count || 0,
        loading: false,
        lastUpdated: new Date(),
      });
    };

    const schedule = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => { void fetchAll(); }, 1500);
    };

    void fetchAll();

    const channel = supabase
      .channel("system-dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "tire_orders" }, schedule)
      .subscribe();

    const interval = window.setInterval(() => { void fetchAll(); }, 60_000);

    return () => {
      active = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return stats;
}