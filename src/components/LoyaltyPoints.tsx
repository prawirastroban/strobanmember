import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Gift, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface LoyaltyData {
  totalPoints: number;
  monthlyPoints: number;
  customerId: string | null;
}

const LoyaltyPoints = () => {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData>({ totalPoints: 0, monthlyPoints: 0, customerId: null });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useLanguage();

  const nextRewardAt = 1000;
  const progressPercentage = Math.min((loyaltyData.totalPoints / nextRewardAt) * 100, 100);
  const availableRewards = Math.floor(loyaltyData.totalPoints / nextRewardAt);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchLoyaltyData = async () => {
      const { data: pointsData, error: pointsError } = await supabase
        .from("loyalty_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pointsError) console.error("Error fetching loyalty points:", pointsError);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("customer_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) console.error("Error fetching profile:", profileError);

      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      const { data: transactionsData, error: transactionsError } = await supabase
        .from("loyalty_transactions")
        .select("points")
        .eq("user_id", user.id)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd + "T23:59:59")
        .gt("points", 0);

      if (transactionsError) console.error("Error fetching transactions:", transactionsError);

      const monthlyPoints = (transactionsData || []).reduce((sum, tx) => sum + tx.points, 0);

      setLoyaltyData({
        totalPoints: pointsData?.total_points || 0,
        monthlyPoints,
        customerId: profileData?.customer_id || null,
      });
      setLoading(false);
    };

    fetchLoyaltyData();

    const channel = supabase
      .channel("loyalty-points-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_points", filter: `user_id=eq.${user.id}` }, () => { fetchLoyaltyData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent fill-accent" />
            {t.loyalty.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-accent fill-accent" />
              {t.loyalty.title}
            </CardTitle>
            {loyaltyData.customerId && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {t.loyalty.memberId}: {loyaltyData.customerId}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{loyaltyData.totalPoints}</p>
            <p className="text-xs text-muted-foreground">{t.common.points}</p>
          </div>
        </div>
        <CardDescription>{t.loyalty.earnRewards}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
            <span className="text-muted-foreground">{t.loyalty.progressToReward}</span>
            <span className="font-semibold">
              {loyaltyData.totalPoints >= nextRewardAt
                ? t.loyalty.rewardAvailable
                : `${nextRewardAt - (loyaltyData.totalPoints % nextRewardAt)} ${t.loyalty.pointsToGo}`}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg text-center">
            <Gift className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{availableRewards}</p>
            <p className="text-xs text-muted-foreground">{t.loyalty.availableRewards}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">+{loyaltyData.monthlyPoints}</p>
            <p className="text-xs text-muted-foreground">{t.loyalty.thisMonth}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-semibold mb-2">{t.loyalty.howToEarn}</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• {t.loyalty.earnPerVisit}</li>
            <li>• {t.loyalty.earnReferrals}</li>
            <li>• {t.loyalty.earnReviews}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoyaltyPoints;
