import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Star, Loader2, Ticket, Clock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_type: string;
  discount_value: number;
}

interface Redemption {
  id: string;
  redemption_code: string;
  points_spent: number;
  status: string;
  expires_at: string;
  created_at: string;
  reward: Reward;
}

interface RedemptionResult {
  success: boolean;
  error?: string;
  redemption_code?: string;
  expires_at?: string;
  reward_name?: string;
  discount_type?: string;
  discount_value?: number;
  required?: number;
  available?: number;
}

export const RewardsStore = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastRedemption, setLastRedemption] = useState<RedemptionResult | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      const { data: rewardsData } = await supabase
        .from("rewards").select("*").eq("is_active", true).order("points_required", { ascending: true });
      if (rewardsData) setRewards(rewardsData);

      const { data: pointsData } = await supabase
        .from("loyalty_points").select("total_points").eq("user_id", user.id).maybeSingle();
      setUserPoints(pointsData?.total_points || 0);

      const { data: redemptionsData } = await supabase
        .from("reward_redemptions")
        .select(`id, redemption_code, points_spent, status, expires_at, created_at, reward:rewards(id, name, description, points_required, discount_type, discount_value)`)
        .eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false });

      if (redemptionsData) {
        const transformed = redemptionsData.map((r) => ({ ...r, reward: Array.isArray(r.reward) ? r.reward[0] : r.reward })) as Redemption[];
        setRedemptions(transformed);
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel("rewards-points")
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_points", filter: `user_id=eq.${user.id}` },
        (payload) => { if (payload.new && "total_points" in payload.new) setUserPoints(payload.new.total_points as number); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleRedeem = async (rewardId: string) => {
    if (!user) return;
    setRedeeming(rewardId);

    const { data, error } = await supabase.rpc("redeem_reward", { _reward_id: rewardId });

    if (error) {
      toast.error(t.rewards.failedToRedeem, { description: error.message });
    } else {
      const result = data as unknown as RedemptionResult;
      if (result.success) {
        setLastRedemption(result);
        setShowSuccessDialog(true);
        toast.success(t.rewards.redeemed, { description: `${t.rewards.yourCodeIs} ${result.redemption_code}` });
        const { data: newRedemptions } = await supabase
          .from("reward_redemptions")
          .select(`id, redemption_code, points_spent, status, expires_at, created_at, reward:rewards(id, name, description, points_required, discount_type, discount_value)`)
          .eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false });
        if (newRedemptions) {
          setRedemptions(newRedemptions.map((r) => ({ ...r, reward: Array.isArray(r.reward) ? r.reward[0] : r.reward })) as Redemption[]);
        }
      } else {
        toast.error(t.rewards.cannotRedeem, { description: result.error || "Unknown error" });
      }
    }
    setRedeeming(null);
  };

  const formatDiscount = (type: string, value: number) => {
    return type === "percentage" ? `${value}% Off` : `$${value} Off`;
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-accent" />
            {t.rewards.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                {t.rewards.title}
              </CardTitle>
              <CardDescription>{t.rewards.subtitle}</CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="font-semibold text-primary">{userPoints} {t.common.pts}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {redemptions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Ticket className="h-4 w-4 text-green-600" />
                {t.rewards.yourActiveRewards}
              </h4>
              <div className="grid gap-3">
                {redemptions.map((redemption) => (
                  <div key={redemption.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-green-500/30 bg-green-500/5">
                    <div>
                      <p className="font-medium">{redemption.reward?.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.rewards.expires} {format(new Date(redemption.expires_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono bg-green-500/10 text-green-700 border-green-500/30">
                      {redemption.redemption_code}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold">{t.rewards.availableRewards}</h4>
            <div className="grid gap-3">
              {rewards.map((reward) => {
                const canAfford = userPoints >= reward.points_required;
                return (
                  <div key={reward.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${canAfford ? "bg-card hover:bg-accent/5 border-border" : "bg-muted/30 border-dashed opacity-60"}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{reward.name}</p>
                        <Badge variant="secondary" className="text-xs">{formatDiscount(reward.discount_type, reward.discount_value)}</Badge>
                      </div>
                      {reward.description && <p className="text-sm text-muted-foreground mt-1">{reward.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <p className="font-bold text-primary">{reward.points_required}</p>
                        <p className="text-xs text-muted-foreground">{t.common.points}</p>
                      </div>
                      <Button size="sm" disabled={!canAfford || redeeming === reward.id} onClick={() => handleRedeem(reward.id)}>
                        {redeeming === reward.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.redeem}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              {t.rewards.rewardRedeemed}
            </DialogTitle>
            <DialogDescription>{t.rewards.rewardRedeemedDesc}</DialogDescription>
          </DialogHeader>
          {lastRedemption && (
            <div className="space-y-4 py-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-muted-foreground mb-1">{t.rewards.yourCode}</p>
                <p className="text-2xl font-mono font-bold text-green-700">{lastRedemption.redemption_code}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">{lastRedemption.reward_name}</p>
                <p className="text-sm text-muted-foreground">
                  {lastRedemption.discount_type === "percentage"
                    ? `${lastRedemption.discount_value}% off`
                    : `$${lastRedemption.discount_value} off`}{" "}
                  {t.rewards.yourNextService}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.rewards.validUntil}{" "}
                  {lastRedemption.expires_at && format(new Date(lastRedemption.expires_at), "MMMM dd, yyyy")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>{t.rewards.gotIt}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RewardsStore;
