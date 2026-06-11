import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CreditCard, Tag, Gift, Users, Wrench, Activity } from "lucide-react";
import TransactionHistory from "@/components/admin/TransactionHistory";
import PaymentsManager from "@/components/admin/PaymentsManager";
import QuickInsightStrip from "@/components/admin/history/QuickInsightStrip";
import PromoTab from "@/components/admin/history/tabs/PromoTab";
import LoyaltyTab from "@/components/admin/history/tabs/LoyaltyTab";
import ReferralTab from "@/components/admin/history/tabs/ReferralTab";
import ServiceTab from "@/components/admin/history/tabs/ServiceTab";
import ActivityTab from "@/components/admin/history/tabs/ActivityTab";

const VALID_TABS = ["bookings", "payments", "promo", "loyalty", "referral", "service", "activity"] as const;
type TabKey = typeof VALID_TABS[number];

export default function HistoryHub() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") || "bookings") as TabKey;
  const [tab, setTab] = useState<TabKey>(VALID_TABS.includes(initial) ? initial : "bookings");

  useEffect(() => {
    const p = (params.get("tab") || "bookings") as TabKey;
    if (VALID_TABS.includes(p) && p !== tab) setTab(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const change = (v: string) => {
    setTab(v as TabKey);
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <QuickInsightStrip />

      <Tabs value={tab} onValueChange={change} className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto gap-1">
            <TabsTrigger value="bookings" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Bookings</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Payments</TabsTrigger>
            <TabsTrigger value="promo" className="gap-1.5"><Tag className="h-3.5 w-3.5" />Promo</TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-1.5"><Gift className="h-3.5 w-3.5" />Loyalty</TabsTrigger>
            <TabsTrigger value="referral" className="gap-1.5"><Users className="h-3.5 w-3.5" />Referral</TabsTrigger>
            <TabsTrigger value="service" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Service</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Aktivitas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bookings" className="mt-0"><TransactionHistory /></TabsContent>
        <TabsContent value="payments" className="mt-0"><PaymentsManager /></TabsContent>
        <TabsContent value="promo" className="mt-0"><PromoTab /></TabsContent>
        <TabsContent value="loyalty" className="mt-0"><LoyaltyTab /></TabsContent>
        <TabsContent value="referral" className="mt-0"><ReferralTab /></TabsContent>
        <TabsContent value="service" className="mt-0"><ServiceTab /></TabsContent>
        <TabsContent value="activity" className="mt-0"><ActivityTab /></TabsContent>
      </Tabs>
    </div>
  );
}