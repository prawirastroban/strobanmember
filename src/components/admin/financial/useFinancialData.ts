import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDateRange, type TimelineValue } from "@/utils/timelineFilter";

export interface FinFilters {
  timeline: TimelineValue;
  branch: string;
  customer: string;
  promoId: string;
  status: string;
}

export interface Booking {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  service_name: string | null;
  service_price: number | null;
  branch: string | null;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  discount_amount: number | null;
  discount_source: string | null;
  discount_code: string | null;
  promo_claim_id: string | null;
  cashback_used: number | null;
  pickup_fee: number | null;
  pickup_return_fee: number | null;
  created_at: string;
  booking_date: string | null;
}

export interface TireOrder {
  id: string;
  user_id: string | null;
  total_amount: number | null;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
}

export interface PromoRow {
  id: string;
  title: string;
  discount_type: string;
  discount_value: number;
}

export interface PromoClaim {
  id: string;
  promo_id: string;
  user_id: string;
  status: string;
  used_at: string | null;
  claimed_at: string;
}

export interface LoyaltyTxn {
  id: string;
  user_id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  used_at: string | null;
  created_at: string;
  rewards?: { name: string; discount_type: string; discount_value: number } | null;
}

export interface ReferralCommission {
  id: string;
  referrer_id: string;
  referee_id: string;
  booking_id: string | null;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface FinancialDataset {
  loading: boolean;
  bookings: Booking[];
  prevBookings: Booking[];
  tireOrders: TireOrder[];
  promos: PromoRow[];
  promoClaims: PromoClaim[];
  loyaltyTxns: LoyaltyTxn[];
  redemptions: RewardRedemption[];
  referrals: ReferralCommission[];
  profilesById: Record<string, { id: string; full_name: string | null; phone: string | null }>;
  range: { start: string; end: string };
  prevRange: { start: string; end: string };
  refetch: () => void;
}

const previousRange = (start: string, end: string) => {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { start: f(prevStart), end: f(prevEnd) };
};

export function useFinancialData(filters: FinFilters): FinancialDataset {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [prevBookings, setPrevBookings] = useState<Booking[]>([]);
  const [tireOrders, setTireOrders] = useState<TireOrder[]>([]);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [promoClaims, setPromoClaims] = useState<PromoClaim[]>([]);
  const [loyaltyTxns, setLoyaltyTxns] = useState<LoyaltyTxn[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [referrals, setReferrals] = useState<ReferralCommission[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, any>>({});
  const [tick, setTick] = useState(0);

  const range = useMemo(() => getDateRange(filters.timeline), [filters.timeline]);
  const prevRange = useMemo(() => previousRange(range.start, range.end), [range]);

  const startISO = useMemo(() => new Date(range.start + "T00:00:00").toISOString(), [range.start]);
  const endISO = useMemo(() => new Date(range.end + "T23:59:59").toISOString(), [range.end]);
  const prevStartISO = useMemo(() => new Date(prevRange.start + "T00:00:00").toISOString(), [prevRange.start]);
  const prevEndISO = useMemo(() => new Date(prevRange.end + "T23:59:59").toISOString(), [prevRange.end]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const bookingFields = "id,user_id,customer_name,customer_phone,service_name,service_price,branch,status,payment_status,payment_method,discount_amount,discount_source,discount_code,promo_claim_id,cashback_used,pickup_fee,pickup_return_fee,created_at,booking_date";

      let bq = supabase.from("bookings").select(bookingFields).gte("created_at", startISO).lte("created_at", endISO);
      if (filters.branch) bq = bq.eq("branch", filters.branch);
      if (filters.status) bq = bq.eq("status", filters.status);
      if (filters.customer.trim()) {
        const t = `%${filters.customer.trim()}%`;
        bq = bq.or(`customer_name.ilike.${t},customer_phone.ilike.${t}`);
      }
      if (filters.promoId) bq = bq.eq("promo_claim_id", filters.promoId);

      let pbq = supabase.from("bookings").select(bookingFields).gte("created_at", prevStartISO).lte("created_at", prevEndISO);
      if (filters.branch) pbq = pbq.eq("branch", filters.branch);

      const [bRes, pbRes, tRes, prRes, pcRes, ltRes, rrRes, rcRes] = await Promise.all([
        bq.order("created_at", { ascending: false }),
        pbq,
        supabase.from("tire_orders").select("id,user_id,total_amount,payment_status,payment_method,created_at").gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("promos").select("id,title,discount_type,discount_value"),
        supabase.from("promo_claims").select("id,promo_id,user_id,status,used_at,claimed_at").gte("claimed_at", startISO).lte("claimed_at", endISO),
        supabase.from("loyalty_transactions").select("id,user_id,points,transaction_type,description,created_at").gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("reward_redemptions").select("id,user_id,reward_id,points_spent,status,used_at,created_at,rewards(name,discount_type,discount_value)").gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("referral_commissions").select("id,referrer_id,referee_id,booking_id,type,amount,status,created_at").gte("created_at", startISO).lte("created_at", endISO),
      ]);

      if (cancelled) return;

      setBookings((bRes.data as Booking[]) || []);
      setPrevBookings((pbRes.data as Booking[]) || []);
      setTireOrders((tRes.data as TireOrder[]) || []);
      setPromos((prRes.data as PromoRow[]) || []);
      setPromoClaims((pcRes.data as PromoClaim[]) || []);
      setLoyaltyTxns((ltRes.data as LoyaltyTxn[]) || []);
      setRedemptions((rrRes.data as RewardRedemption[]) || []);
      const refs = (rcRes.data as ReferralCommission[]) || [];
      setReferrals(refs);

      const ids = Array.from(new Set(refs.map((r) => r.referrer_id))).filter(Boolean);
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,phone").in("id", ids);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p; });
        if (!cancelled) setProfilesById(map);
      } else {
        setProfilesById({});
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [startISO, endISO, prevStartISO, prevEndISO, filters.branch, filters.status, filters.customer, filters.promoId, tick]);

  return {
    loading, bookings, prevBookings, tireOrders, promos, promoClaims,
    loyaltyTxns, redemptions, referrals, profilesById, range, prevRange,
    refetch: () => setTick((t) => t + 1),
  };
}

export type PaymentCategory =
  | "full" | "partial" | "promo" | "loyalty" | "referral" | "free" | "warranty" | "manual";

export function classifyBooking(b: Booking): PaymentCategory {
  const price = Number(b.service_price || 0);
  if (price === 0) return "free";
  if (b.promo_claim_id || b.discount_source === "promo") return "promo";
  if (b.discount_source === "reward" || b.discount_source === "loyalty") return "loyalty";
  if (Number(b.cashback_used || 0) > 0 || b.discount_source === "cashback" || b.discount_source === "referral") return "referral";
  if (b.payment_status === "pay_later") return "partial";
  return "full";
}

export function bookingNet(b: Booking): number {
  const svc = Number(b.service_price || 0);
  const pf = Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0);
  const disc = Number(b.discount_amount || 0);
  const cb = Number(b.cashback_used || 0);
  return Math.max(0, svc + pf - disc - cb);
}

export function bookingGross(b: Booking): number {
  return Number(b.service_price || 0) + Number(b.pickup_fee || 0) + Number(b.pickup_return_fee || 0);
}

export function isPaid(b: Booking): boolean {
  return ["paid", "success", "settled", "captured"].includes((b.payment_status || "").toLowerCase());
}

export function isPaidTire(t: TireOrder): boolean {
  return ["paid", "success", "settled", "captured"].includes((t.payment_status || "").toLowerCase());
}
