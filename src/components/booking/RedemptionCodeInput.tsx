import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Tag, Loader2, X, Percent, DollarSign, Ticket } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
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

const RedemptionCodeInput = ({ userId, onRedemptionApplied, appliedRedemption }: RedemptionCodeInputProps) => {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [availableCodes, setAvailableCodes] = useState<RedemptionData[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { t } = useLanguage();

  const loadAvailableCodes = async () => {
    if (!userId) { toast.error(t.booking.signInForCodes); return; }
    setLoadingCodes(true);
    try {
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select(`id, redemption_code, expires_at, status, rewards (name, discount_type, discount_value)`)
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true });
      if (error) throw error;
      const mapped: RedemptionData[] = (data || []).map((r: any) => ({
        id: r.id,
        redemption_code: r.redemption_code,
        discount_type: r.rewards?.discount_type ?? "percentage",
        discount_value: r.rewards?.discount_value ?? 0,
        reward_name: r.rewards?.name ?? "Reward",
        expires_at: r.expires_at,
      }));
      setAvailableCodes(mapped);
    } catch (err) {
      console.error("Load codes error:", err);
      toast.error(t.booking.failedValidate);
    } finally {
      setLoadingCodes(false);
    }
  };

  const applyFromList = (r: RedemptionData) => {
    setCode(r.redemption_code);
    onRedemptionApplied(r);
    setPopoverOpen(false);
    toast.success(`${t.booking.codeApplied}: ${r.reward_name}`);
  };

  const validateCode = async () => {
    if (!code.trim()) { toast.error(t.booking.enterCode); return; }
    if (!userId) { toast.error(t.booking.signInForCodes); return; }

    setIsValidating(true);

    try {
      const { data: redemption, error } = await supabase
        .from("reward_redemptions")
        .select(`id, redemption_code, expires_at, status, user_id, rewards (name, discount_type, discount_value)`)
        .eq("redemption_code", code.trim().toUpperCase())
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (error) { console.error("Redemption lookup error:", error); toast.error(t.booking.failedValidate); return; }
      if (!redemption) { toast.error(t.booking.invalidCode); return; }
      if (new Date(redemption.expires_at) < new Date()) { toast.error(t.booking.expiredCode); return; }

      const reward = redemption.rewards as { name: string; discount_type: string; discount_value: number } | null;
      if (!reward) { toast.error(t.booking.rewardNotFound); return; }

      onRedemptionApplied({
        id: redemption.id,
        redemption_code: redemption.redemption_code,
        discount_type: reward.discount_type,
        discount_value: reward.discount_value,
        reward_name: reward.name,
        expires_at: redemption.expires_at,
      });
      toast.success(`${t.booking.codeApplied}: ${reward.name}`);
    } catch (err) {
      console.error("Validation error:", err);
      toast.error(t.booking.failedValidate);
    } finally {
      setIsValidating(false);
    }
  };

  const removeCode = () => {
    setCode("");
    onRedemptionApplied(null);
    toast.info(t.booking.codeRemoved);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">5</div>
              {t.booking.redemptionCode}
            </CardTitle>
            <CardDescription>{t.booking.redemptionCodeDesc}</CardDescription>
          </div>
          {appliedRedemption && (
            <Badge variant="default" className="bg-accent">
              <Check className="h-3 w-3 mr-1" /> {t.common.applied}
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
                  {appliedRedemption.discount_type === "percentage" ? <Percent className="h-5 w-5 text-accent" /> : <DollarSign className="h-5 w-5 text-accent" />}
                </div>
                <div>
                  <p className="font-semibold text-accent">{appliedRedemption.reward_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Code: {appliedRedemption.redemption_code} •{" "}
                    {appliedRedemption.discount_type === "percentage" ? ` ${appliedRedemption.discount_value}% off` : ` $${appliedRedemption.discount_value} off`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={removeCode}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="redemptionCode" className="sr-only">{t.booking.redemptionCode}</Label>
              <div className="relative">
                <Popover open={popoverOpen} onOpenChange={(o) => { setPopoverOpen(o); if (o) loadAvailableCodes(); }}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Lihat kode voucher tersedia"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Tag className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-0">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" /> Voucher Tersedia
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Klik untuk langsung pakai</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {loadingCodes ? (
                        <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                      ) : availableCodes.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          Belum ada voucher aktif. Tukar poin di Loyalty Rewards.
                        </div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {availableCodes.map((r) => (
                            <li key={r.id}>
                              <button
                                type="button"
                                onClick={() => applyFromList(r)}
                                className="w-full text-left p-3 hover:bg-accent/50 transition-colors flex items-center gap-3"
                              >
                                <div className="p-2 rounded-full bg-primary/10 shrink-0">
                                  {r.discount_type === "percentage"
                                    ? <Percent className="h-4 w-4 text-primary" />
                                    : <DollarSign className="h-4 w-4 text-primary" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate">{r.reward_name}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono truncate">{r.redemption_code}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {r.discount_type === "percentage" ? `${r.discount_value}% off` : `Rp ${r.discount_value.toLocaleString("id-ID")} off`}
                                    {" • exp "}{new Date(r.expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                                  </p>
                                </div>
                                <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Input
                  id="redemptionCode"
                  placeholder={t.booking.enterRedemptionCode}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="pl-11 uppercase"
                  maxLength={20}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); validateCode(); } }}
                />
              </div>
            </div>
            <Button onClick={validateCode} disabled={isValidating || !code.trim()}>
              {isValidating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.booking.validating}</>) : t.common.apply}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RedemptionCodeInput;
