import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardBadgeCounts {
  pendingBookings: number;
  newComplaints: number;
  pendingPayments: number;
  unverifiedUsers: number;
  expiredPromos: number;
}

const initial: DashboardBadgeCounts = {
  pendingBookings: 0,
  newComplaints: 0,
  pendingPayments: 0,
  unverifiedUsers: 0,
  expiredPromos: 0,
};

export function useDashboardBadges() {
  const [counts, setCounts] = useState<DashboardBadgeCounts>(initial);

  useEffect(() => {
    let active = true;
    const fetchCounts = async () => {
      const [bookingsRes, complaints, paymentsRes, users, promosRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, status, cancel_requested")
          .or("status.eq.pending,status.eq.waiting_confirmation,cancel_requested.eq.true"),
        supabase.from("vehicle_complaints").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase
          .from("payments")
          .select("id, payment_status, bookings!inner(status)")
          .eq("payment_status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", false),
        supabase.from("promos").select("id, is_active, end_date"),
      ]);

      if (!active) return;

      const pendingBookings = (bookingsRes.data || []).length;
      const pendingPayments = (paymentsRes.data || []).filter((p: any) => {
        const s = p?.bookings?.status;
        return s !== "cancelled" && s !== "completed";
      }).length;
      const now = Date.now();
      const expiredPromos = (promosRes.data || []).filter((p: any) => {
        if (p?.is_active === false) return true;
        if (p?.end_date && new Date(p.end_date).getTime() < now) return true;
        return false;
      }).length;

      setCounts({
        pendingBookings,
        newComplaints: complaints.count || 0,
        pendingPayments,
        unverifiedUsers: users.count || 0,
        expiredPromos,
      });
    };
    fetchCounts();

    const channel = supabase
      .channel("dashboard-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_complaints" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "promos" }, fetchCounts)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const badgeFor = useCallback((url: string): number => {
    switch (url) {
      case "/dashboard/bookings":
        return counts.pendingBookings;
      case "/dashboard/complaints":
        return counts.newComplaints;
      case "/dashboard/crm":
        return counts.newComplaints;
      case "/dashboard/customers":
        return counts.unverifiedUsers;
      case "/dashboard/keuangan":
      case "/dashboard/keuangan/payment":
        return counts.pendingPayments;
      case "/dashboard/marketing/promos":
      case "/dashboard/marketing":
        return counts.expiredPromos;
      default:
        return 0;
    }
  }, [counts]);

  return { counts, badgeFor };
}