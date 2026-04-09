import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { LayoutGrid, Trophy, Gift, Megaphone, TrendingUp, Users } from "lucide-react";

const MarketingOverview = () => {
  const [stats, setStats] = useState({
    totalServices: 0,
    activeServices: 0,
    activeRewards: 0,
    totalRewards: 0,
    totalLoyaltyUsers: 0,
    totalPointsIssued: 0,
    activePromos: 0,
    expiredPromos: 0,
  });

  useEffect(() => {
    const fetch = async () => {
      const [servicesRes, rewardsRes, loyaltyRes] = await Promise.all([
        supabase.from("services").select("id, is_active"),
        supabase.from("rewards").select("id, is_active"),
        supabase.from("loyalty_points").select("user_id, total_points"),
      ]);

      const services = servicesRes.data || [];
      const rewards = rewardsRes.data || [];
      const loyalty = loyaltyRes.data || [];

      setStats({
        totalServices: services.length,
        activeServices: services.filter((s) => s.is_active).length,
        totalRewards: rewards.length,
        activeRewards: rewards.filter((r) => r.is_active).length,
        activePromos: rewards.filter((r) => r.is_active).length,
        expiredPromos: rewards.filter((r) => !r.is_active).length,
        totalLoyaltyUsers: loyalty.length,
        totalPointsIssued: loyalty.reduce((sum, l) => sum + l.total_points, 0),
      });
    };
    fetch();
  }, []);

  const cards = [
    { label: "Active Services", value: stats.activeServices, sub: `${stats.totalServices} total`, icon: LayoutGrid, color: "text-blue-500" },
    { label: "Active Rewards", value: stats.activeRewards, sub: `${stats.expiredPromos} expired`, icon: Gift, color: "text-green-500" },
    { label: "Loyalty Members", value: stats.totalLoyaltyUsers, sub: `${stats.totalPointsIssued.toLocaleString()} pts issued`, icon: Trophy, color: "text-orange-500" },
    { label: "Active Promos", value: stats.activePromos, sub: `${stats.totalRewards} total`, icon: Megaphone, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.sub}</p>
                </div>
                <c.icon className={`h-8 w-8 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marketing & Catalog Hub</CardTitle>
          <CardDescription>
            Manage services, loyalty program, and rewards from the sub-menus on the left.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Services", desc: "Manage service catalog, pricing, and categories", icon: LayoutGrid },
              { title: "Loyalty", desc: "Monitor points, analytics, and member engagement", icon: Trophy },
              { title: "Rewards", desc: "Create and manage redeemable reward offers", icon: Gift },
            ].map((item) => (
              <Card key={item.title} className="border-dashed">
                <CardContent className="pt-6 text-center space-y-2">
                  <item.icon className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingOverview;
