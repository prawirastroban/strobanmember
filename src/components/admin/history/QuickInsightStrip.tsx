import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, DollarSign, Tag, Gift, Users } from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtIDR = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

const Item = ({ icon: Icon, label, value }: any) => (
  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl px-3 py-2 min-w-[140px]">
    <Icon className="h-4 w-4 text-primary shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  </div>
);

export default function QuickInsightStrip() {
  const [data, setData] = useState({ bookings: 0, revenue: 0, promo: 0, loyalty: 0, referral: 0 });

  useEffect(() => {
    const load = async () => {
      const day = todayISO();
      const start = `${day}T00:00:00`;
      const end = `${day}T23:59:59`;
      const [b, p, lo, rf] = await Promise.all([
        supabase.from("bookings").select("id,service_price,payment_status,discount_source,promo_claim_id,cashback_used", { count: "exact" })
          .gte("created_at", start).lte("created_at", end),
        supabase.from("payments").select("amount,payment_status", { count: "exact" })
          .eq("payment_status", "success").gte("created_at", start).lte("created_at", end),
        supabase.from("loyalty_transactions").select("id", { count: "exact", head: true })
          .gte("created_at", start).lte("created_at", end),
        supabase.from("referral_commissions").select("id", { count: "exact", head: true })
          .gte("created_at", start).lte("created_at", end),
      ]);
      const revenue = (p.data || []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
      const promoUsed = (b.data || []).filter((x: any) => x.promo_claim_id || x.discount_source === "promo").length;
      setData({
        bookings: b.count || 0,
        revenue,
        promo: promoUsed,
        loyalty: lo.count || 0,
        referral: rf.count || 0,
      });
    };
    load();
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      <Item icon={Calendar} label="Hari Ini · Booking" value={data.bookings} />
      <Item icon={DollarSign} label="Revenue" value={fmtIDR(data.revenue)} />
      <Item icon={Tag} label="Promo" value={data.promo} />
      <Item icon={Gift} label="Loyalty" value={data.loyalty} />
      <Item icon={Users} label="Referral" value={data.referral} />
    </div>
  );
}