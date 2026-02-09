import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Tag, Loader2, X, Percent, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RedemptionData {
  id: string;
  redemption_code: string;
  discount_type: string;
  discount_value: number;
  reward_name: string;
  expires_at: string;
}

interface RedemptionCodeInputProps {
  userId: string | undefined;
  onRedemptionApplied: (redemption: RedemptionData | null) => void;
  appliedRedemption: RedemptionData | null;
}

const RedemptionCodeInput = ({
  userId,
  onRedemptionApplied,
  appliedRedemption,
}: RedemptionCodeInputProps) => {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const validateCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter a redemption code");
      return;
    }

    if (!userId) {
      toast.error("Please sign in to use redemption codes");
      return;
    }

    setIsValidating(true);

    try {
      // Look up the redemption code
      const { data: redemption, error } = await supabase
        .from("reward_redemptions")
        .select(`
          id,
          redemption_code,
          expires_at,
          status,
          user_id,
          rewards (
            name,
            discount_type,
            discount_value
          )
        `)
        .eq("redemption_code", code.trim().toUpperCase())
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("Redemption lookup error:", error);
        toast.error("Failed to validate code");
        return;
      }

      if (!redemption) {
        toast.error("Invalid or expired redemption code");
        return;
      }

      // Check if expired
      if (new Date(redemption.expires_at) < new Date()) {
        toast.error("This redemption code has expired");
        return;
      }

      const reward = redemption.rewards as { name: string; discount_type: string; discount_value: number } | null;
      
      if (!reward) {
        toast.error("Reward not found for this code");
        return;
      }

      const redemptionData: RedemptionData = {
        id: redemption.id,
        redemption_code: redemption.redemption_code,
        discount_type: reward.discount_type,
        discount_value: reward.discount_value,
        reward_name: reward.name,
        expires_at: redemption.expires_at,
      };

      onRedemptionApplied(redemptionData);
      toast.success(`Code applied: ${reward.name}`);
    } catch (err) {
      console.error("Validation error:", err);
      toast.error("Failed to validate code");
    } finally {
      setIsValidating(false);
    }
  };

  const removeCode = () => {
    setCode("");
    onRedemptionApplied(null);
    toast.info("Redemption code removed");
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                5
              </div>
              Redemption Code
            </CardTitle>
            <CardDescription>Apply a reward code for a discount (optional)</CardDescription>
          </div>
          {appliedRedemption && (
            <Badge variant="default" className="bg-accent">
              <Check className="h-3 w-3 mr-1" />
              Applied
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {appliedRedemption ? (
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent/20">
                  {appliedRedemption.discount_type === "percentage" ? (
                    <Percent className="h-5 w-5 text-accent" />
                  ) : (
                    <DollarSign className="h-5 w-5 text-accent" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-accent">{appliedRedemption.reward_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Code: {appliedRedemption.redemption_code} • 
                    {appliedRedemption.discount_type === "percentage"
                      ? ` ${appliedRedemption.discount_value}% off`
                      : ` $${appliedRedemption.discount_value} off`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={removeCode}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="redemptionCode" className="sr-only">
                Redemption Code
              </Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="redemptionCode"
                  placeholder="Enter redemption code (e.g., RWD-XXXXXXXX)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="pl-10 uppercase"
                  maxLength={20}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      validateCode();
                    }
                  }}
                />
              </div>
            </div>
            <Button onClick={validateCode} disabled={isValidating || !code.trim()}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RedemptionCodeInput;
