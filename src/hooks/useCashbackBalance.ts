import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CashbackLedgerRow {
  id: string;
  type: "credit" | "debit" | "refund" | "expire" | "adjust";
  amount: number;
  description: string | null;
  booking_id: string | null;
  promo_id: string | null;
  expires_at: string | null;
  created_at: string;
}

/**
 * Reactive cashback wallet for a user. Returns current balance (Rp), expiring
 * soon amount, and full ledger history. Subscribes to realtime ledger updates.
 */
export const useCashbackBalance = (userId: string | undefined) => {
  const [balance, setBalance] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [history, setHistory] = useState<CashbackLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      setExpiringSoon(0);
      setHistory([]);
      setLoading(false);
      return;
    }
    const [bRes, hRes] = await Promise.all([
      supabase
        .from("cashback_balances" as any)
        .select("balance, expiring_soon")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("cashback_ledger" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const bRow = (bRes.data as any) ?? null;
    setBalance(Number(bRow?.balance ?? 0));
    setExpiringSoon(Number(bRow?.expiring_soon ?? 0));
    setHistory(((hRes.data as any[]) || []) as CashbackLedgerRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!userId) return;
    const ch = supabase
      .channel(`cashback-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cashback_ledger", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, load]);

  return { balance, expiringSoon, history, loading, refresh: load };
};