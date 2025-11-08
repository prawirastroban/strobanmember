import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Gift, TrendingUp } from "lucide-react";

const LoyaltyPoints = () => {
  const currentPoints = 850;
  const nextRewardAt = 1000;
  const progressPercentage = (currentPoints / nextRewardAt) * 100;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent fill-accent" />
            Loyalty Points
          </CardTitle>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{currentPoints}</p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
        <CardDescription>Earn rewards with every service</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to next reward</span>
            <span className="font-semibold">{nextRewardAt - currentPoints} points to go</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg text-center">
            <Gift className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">Available Rewards</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">+120</p>
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
