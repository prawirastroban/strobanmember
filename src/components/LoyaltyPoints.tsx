import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Gift, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface LoyaltyData {
  totalPoints: number;
  monthlyPoints: number;
}

const LoyaltyPoints = () => {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData>({ totalPoints: 0, monthlyPoints: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const nextRewardAt = 1000;
  const progressPercentage = Math.min((loyaltyData.totalPoints / nextRewardAt) * 100, 100);
  const availableRewards = Math.floor(loyaltyData.totalPoints / nextRewardAt);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchLoyaltyData = async () => {
      // Fetch total points
      const { data: pointsData, error: pointsError } = await supabase
        .from("loyalty_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pointsError) {
        console.error("Error fetching loyalty points:", pointsError);
      }

      // Fetch this month's earned points
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      const { data: transactionsData, error: transactionsError } = await supabase
        .from("loyalty_transactions")
        .select("points")
        .eq("user_id", user.id)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd + "T23:59:59")
        .gt("points", 0); // Only positive transactions (earnings)

      if (transactionsError) {
        console.error("Error fetching transactions:", transactionsError);
      }

      const monthlyPoints = (transactionsData || []).reduce((sum, tx) => sum + tx.points, 0);

      setLoyaltyData({
        totalPoints: pointsData?.total_points || 0,
        monthlyPoints,
      });
      setLoading(false);
    };

    fetchLoyaltyData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("loyalty-points-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loyalty_points",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchLoyaltyData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent fill-accent" />
            Loyalty Points
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
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent fill-accent" />
            Loyalty Points
          </CardTitle>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{loyaltyData.totalPoints}</p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
        <CardDescription>Earn rewards with every service</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to next reward</span>
            <span className="font-semibold">
              {loyaltyData.totalPoints >= nextRewardAt
                ? "Reward available!"
                : `${nextRewardAt - (loyaltyData.totalPoints % nextRewardAt)} points to go`}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg text-center">
            <Gift className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{availableRewards}</p>
            <p className="text-xs text-muted-foreground">Available Rewards</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">+{loyaltyData.monthlyPoints}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-semibold mb-2">How to earn points:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• 100 points per service visit</li>
            <li>• 50 points for referrals</li>
            <li>• 25 points for reviews</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoyaltyPoints;
