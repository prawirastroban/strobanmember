import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Award,
  Ticket,
  Users,
  RefreshCw,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfDay } from "date-fns";

interface Stats {
  totalPointsAwarded: number;
  totalPointsRedeemed: number;
  totalRedemptions: number;
  activeUsers: number;
  averagePointsPerUser: number;
}

interface PopularReward {
  name: string;
  count: number;
  points: number;
}

interface DailyActivity {
  date: string;
  earned: number;
  redeemed: number;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted))",
  "hsl(var(--destructive))",
];

const LoyaltyAnalytics = () => {
  const [stats, setStats] = useState<Stats>({
    totalPointsAwarded: 0,
    totalPointsRedeemed: 0,
    totalRedemptions: 0,
    activeUsers: 0,
    averagePointsPerUser: 0,
  });
  const [popularRewards, setPopularRewards] = useState<PopularReward[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all loyalty transactions
      const { data: transactions, error: txError } = await supabase
        .from("loyalty_transactions")
        .select("*");

      if (txError) throw txError;

      // Calculate totals
      let totalAwarded = 0;
      let totalRedeemed = 0;
      const userSet = new Set<string>();

      transactions?.forEach((tx) => {
        userSet.add(tx.user_id);
        if (tx.points > 0) {
          totalAwarded += tx.points;
        } else {
          totalRedeemed += Math.abs(tx.points);
        }
      });

      // Fetch redemptions count
      const { count: redemptionCount } = await supabase
        .from("reward_redemptions")
        .select("*", { count: "exact", head: true });

      // Calculate average points per user
      const { data: loyaltyPoints } = await supabase
        .from("loyalty_points")
        .select("total_points");

      const totalCurrentPoints = loyaltyPoints?.reduce(
        (sum, lp) => sum + lp.total_points,
        0
      ) || 0;
      const avgPoints = userSet.size > 0 
        ? Math.round(totalCurrentPoints / userSet.size) 
        : 0;

      setStats({
        totalPointsAwarded: totalAwarded,
        totalPointsRedeemed: totalRedeemed,
        totalRedemptions: redemptionCount || 0,
        activeUsers: userSet.size,
        averagePointsPerUser: avgPoints,
      });

      // Fetch popular rewards
      const { data: redemptions } = await supabase
        .from("reward_redemptions")
        .select(`
          reward_id,
          points_spent,
          rewards (name)
        `);

      if (redemptions) {
        const rewardCounts: Record<string, { count: number; points: number; name: string }> = {};
        redemptions.forEach((r) => {
          const name = r.rewards?.name || "Unknown";
          if (!rewardCounts[r.reward_id]) {
            rewardCounts[r.reward_id] = { count: 0, points: 0, name };
          }
          rewardCounts[r.reward_id].count += 1;
          rewardCounts[r.reward_id].points += r.points_spent;
        });

        const sorted = Object.values(rewardCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setPopularRewards(sorted);
      }

      // Calculate daily activity for last 14 days
      const last14Days: DailyActivity[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        const dateStr = format(date, "yyyy-MM-dd");
        const displayDate = format(date, "MMM d");

        const dayTransactions = transactions?.filter((tx) => {
          const txDate = format(new Date(tx.created_at), "yyyy-MM-dd");
          return txDate === dateStr;
        }) || [];

        let earned = 0;
        let redeemed = 0;
        dayTransactions.forEach((tx) => {
          if (tx.points > 0) {
            earned += tx.points;
          } else {
            redeemed += Math.abs(tx.points);
          }
        });

        last14Days.push({ date: displayDate, earned, redeemed });
      }
      setDailyActivity(last14Days);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading analytics",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const statCards = [
    {
      title: "Total Points Awarded",
      value: stats.totalPointsAwarded.toLocaleString(),
      icon: Coins,
      description: "Points earned from services",
    },
    {
      title: "Points Redeemed",
      value: stats.totalPointsRedeemed.toLocaleString(),
      icon: Ticket,
      description: "Points spent on rewards",
    },
    {
      title: "Total Redemptions",
      value: stats.totalRedemptions.toLocaleString(),
      icon: Award,
      description: "Rewards claimed",
    },
    {
      title: "Active Members",
      value: stats.activeUsers.toLocaleString(),
      icon: Users,
      description: "Users with point activity",
    },
    {
      title: "Avg Points/User",
      value: stats.averagePointsPerUser.toLocaleString(),
      icon: TrendingUp,
      description: "Current balance average",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Loyalty Program Analytics</CardTitle>
              <CardDescription>
                Track points, redemptions, and member engagement
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" onClick={fetchAnalytics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{stat.title}</span>
                </div>
                <p className="text-2xl font-bold">{isLoading ? "..." : stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Points Activity Chart */}
          <Card className="border border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Points Activity (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden px-2 sm:px-6">
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ChartContainer
                  config={{
                    earned: { label: "Earned", color: "hsl(var(--primary))" },
                    redeemed: { label: "Redeemed", color: "hsl(var(--destructive))" },
                  }}
                  className="h-[200px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyActivity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="earned"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="redeemed"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Popular Rewards Chart */}
          <Card className="border border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Most Popular Rewards</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden px-2 sm:px-6">
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : popularRewards.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No redemptions yet
                </div>
              ) : (
                <ChartContainer
                  config={{
                    count: { label: "Redemptions", color: "hsl(var(--primary))" },
                  }}
                  className="h-[200px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={popularRewards} layout="vertical" margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        width={80}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Points Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Points Distribution Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Awarded</p>
                  <p className="text-xl font-bold">
                    {stats.totalPointsAwarded.toLocaleString()} pts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Redeemed</p>
                  <p className="text-xl font-bold">
                    {stats.totalPointsRedeemed.toLocaleString()} pts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Redemption Rate</p>
                  <p className="text-xl font-bold">
                    {stats.totalPointsAwarded > 0
                      ? Math.round(
                          (stats.totalPointsRedeemed / stats.totalPointsAwarded) * 100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default LoyaltyAnalytics;
