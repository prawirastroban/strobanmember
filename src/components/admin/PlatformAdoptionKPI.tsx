import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Users, Repeat, Share2, Tag, CalendarCheck, UserCheck, UserMinus } from "lucide-react";
import { subDays, format } from "date-fns";

interface KPI { label: string; value: string; hint?: string; icon: any; accent?: boolean }

const Stat = ({ k }: { k: KPI }) => (
  <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
    <CardContent className="pt-5 pb-4 px-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</p>
          <p className="text-2xl font-bold tracking-tight">{k.value}</p>
          {k.hint && <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${k.accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          <k.icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PlatformAdoptionKPI({ days = 30 }: { days?: number }) {
  const [k, setK] = useState<KPI[] | null>(null);

  useEffect(() => {
    (async () => {
      const end = format(new Date(), "yyyy-MM-dd");
      const start = format(subDays(new Date(), days), "yyyy-MM-dd");

      const [bookingsR, profilesR, promoR, refR] = await Promise.all([
        supabase.from("bookings")
          .select("booking_source, status, user_id, customer_phone, booking_date")
          .gte("booking_date", start).lte("booking_date", end),
        supabase.from("profiles")
          .select("id, created_at, acquisition_source")
          .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`),
        supabase.from("promo_claims")
          .select("id, claimed_at")
          .gte("claimed_at", `${start}T00:00:00`).lte("claimed_at", `${end}T23:59:59`),
        supabase.from("referral_commissions")
          .select("id, status, created_at")
          .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`),
      ]);

      const bookings = bookingsR.data || [];
      const profiles = profilesR.data || [];
      const promos = promoR.data || [];
      const refs = refR.data || [];

      const total = bookings.length;
      const self_b = bookings.filter((b: any) => b.booking_source === "self_booking").length;
      const manual = total - self_b;
      const rate = total ? (self_b / total) * 100 : 0;

      // Repeat: customer_phone appearing in >1 booking in period
      const phoneCount: Record<string, number> = {};
      bookings.forEach((b: any) => {
        const p = b.customer_phone || "-";
        phoneCount[p] = (phoneCount[p] || 0) + 1;
      });
      const repeatCustomers = Object.values(phoneCount).filter((c) => c > 1).length;

      const refConverted = refs.filter((r: any) => r.status === "paid" || r.status === "approved").length;
      const refRate = refs.length ? (refConverted / refs.length) * 100 : 0;
      const promoRate = total ? (promos.length / total) * 100 : 0;

      setK([
        { label: "Total Booking", value: total.toLocaleString("id-ID"), icon: CalendarCheck, hint: `${days}h terakhir` },
        { label: "Self Booking", value: self_b.toLocaleString("id-ID"), icon: Rocket, accent: true },
        { label: "Manual Booking", value: manual.toLocaleString("id-ID"), icon: UserMinus },
        { label: "Self Booking Rate", value: `${rate.toFixed(1)}%`, icon: Rocket, accent: true, hint: "Target: ≥70%" },
        { label: "Customer Baru", value: profiles.length.toLocaleString("id-ID"), icon: UserCheck },
        { label: "Customer Repeat", value: repeatCustomers.toLocaleString("id-ID"), icon: Repeat, hint: ">1 booking" },
        { label: "Referral Conversion", value: `${refRate.toFixed(1)}%`, icon: Share2, hint: `${refConverted}/${refs.length}` },
        { label: "Promo Conversion", value: `${promoRate.toFixed(1)}%`, icon: Tag, hint: `${promos.length} klaim` },
      ]);
    })();
  }, [days]);

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          Adopsi Platform — {days} hari terakhir
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!k ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Memuat KPI…</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {k.map((x, i) => <Stat key={i} k={x} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}