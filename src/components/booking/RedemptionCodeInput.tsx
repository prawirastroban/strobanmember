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
  applicable_categories?: string[] | null;
  source?: "reward" | "promo";
}

interface RedemptionCodeInputProps {
  userId: string | undefined;
  onRedemptionApplied: (redemption: RedemptionData | null) => void;
  appliedRedemption: RedemptionData | null;
  /** Kategori layanan yang dipilih user. Voucher dengan applicable_categories
   * yang tidak overlap akan disembunyikan/ditolak. Jika kosong, semua voucher
   * berlaku. */
  selectedServiceCategories?: string[];
}

const isCategoryEligible = (
  applicable: string[] | null | undefined,
  selected: string[] | undefined,
) => {
  // No restriction → eligible for everything
  if (!applicable || applicable.length === 0) return true;
  // No selection → can't determine; show as eligible (filter happens at apply time)
  if (!selected || selected.length === 0) return true;
  return selected.some((c) => applicable.includes(c));
};

const RedemptionCodeInput = ({
  userId,
  onRedemptionApplied,
  appliedRedemption,
  selectedServiceCategories = [],
}: RedemptionCodeInputProps) => {
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
      // 1) Reward redemption codes
      const { data: rwdData, error: rwdErr } = await supabase
        .from("reward_redemptions")
        .select(`id, redemption_code, expires_at, status, rewards (name, discount_type, discount_value, applicable_categories)`)
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true });
      if (rwdErr) throw rwdErr;
      const rewardCodes: RedemptionData[] = (rwdData || []).map((r: any) => ({
        id: r.id,
        redemption_code: r.redemption_code,
        discount_type: r.rewards?.discount_type ?? "percentage",
        discount_value: r.rewards?.discount_value ?? 0,
        reward_name: r.rewards?.name ?? "Reward",
        expires_at: r.expires_at,
        applicable_categories: r.rewards?.applicable_categories ?? [],
        source: "reward" as const,
      }));

      // 2) Promo voucher claims
      const { data: pcData, error: pcErr } = await supabase
        .from("promo_claims")
        .select(`id, voucher_code, expires_at, status, promos (title, discount_type, discount_value, applicable_categories)`)
        .eq("user_id", userId)
        .eq("status", "active")
        .order("claimed_at", { ascending: false });
      if (pcErr) throw pcErr;
      const promoCodes: RedemptionData[] = (pcData || [])
        .filter((r: any) => !r.expires_at || new Date(r.expires_at) > new Date())
        .map((r: any) => ({
          id: r.id,
          redemption_code: r.voucher_code,
          discount_type: r.promos?.discount_type ?? "percentage",
          discount_value: r.promos?.discount_value ?? 0,
          reward_name: r.promos?.title ?? "Voucher",
          expires_at: r.expires_at ?? new Date(Date.now() + 365 * 86400000).toISOString(),
          applicable_categories: r.promos?.applicable_categories ?? [],
          source: "promo" as const,
        }));

      // 3) Filter by selected service categories
      const merged = [...rewardCodes, ...promoCodes].filter((c) =>
        isCategoryEligible(c.applicable_categories, selectedServiceCategories)
      );
      setAvailableCodes(merged);
    } catch (err) {
      console.error("Load codes error:", err);
      toast.error(t.booking.failedValidate);
    } finally {
      setLoadingCodes(false);
    }
  };

  const applyFromList = (r: RedemptionData) => {
    if (!isCategoryEligible(r.applicable_categories, selectedServiceCategories)) {
      toast.error("Voucher ini tidak berlaku untuk layanan yang dipilih.");
      return;
    }
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
      const upper = code.trim().toUpperCase();

      // Try reward_redemptions first
      const { data: redemption, error } = await supabase
        .from("reward_redemptions")
        .select(`id, redemption_code, expires_at, status, user_id, rewards (name, discount_type, discount_value, applicable_categories)`)
        .eq("redemption_code", upper)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (error) { console.error("Redemption lookup error:", error); toast.error(t.booking.failedValidate); return; }

      if (redemption) {
        if (new Date(redemption.expires_at) < new Date()) { toast.error(t.booking.expiredCode); return; }
        const reward = redemption.rewards as { name: string; discount_type: string; discount_value: number; applicable_categories?: string[] } | null;
        if (!reward) { toast.error(t.booking.rewardNotFound); return; }
        if (!isCategoryEligible(reward.applicable_categories, selectedServiceCategories)) {
          toast.error("Voucher hanya berlaku untuk layanan kategori tertentu yang tidak Anda pilih.");
          return;
        }
        onRedemptionApplied({
          id: redemption.id,
          redemption_code: redemption.redemption_code,
          discount_type: reward.discount_type,
          discount_value: reward.discount_value,
          reward_name: reward.name,
          expires_at: redemption.expires_at,
          applicable_categories: reward.applicable_categories ?? [],
          source: "reward",
        });
        toast.success(`${t.booking.codeApplied}: ${reward.name}`);
        return;
      }

      // Fallback: try promo_claims voucher code
      const { data: claim, error: cErr } = await supabase
        .from("promo_claims")
        .select(`id, voucher_code, expires_at, status, promos (title, discount_type, discount_value, applicable_categories)`)
        .eq("voucher_code", upper)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (cErr) { console.error("Promo claim lookup error:", cErr); toast.error(t.booking.failedValidate); return; }
      if (!claim) { toast.error(t.booking.invalidCode); return; }
      if (claim.expires_at && new Date(claim.expires_at) < new Date()) { toast.error(t.booking.expiredCode); return; }
      const promo = claim.promos as { title: string; discount_type: string; discount_value: number; applicable_categories?: string[] } | null;
      if (!promo) { toast.error(t.booking.rewardNotFound); return; }
      if (!isCategoryEligible(promo.applicable_categories, selectedServiceCategories)) {
        toast.error("Voucher ini tidak berlaku untuk layanan yang dipilih.");
        return;
      }
      onRedemptionApplied({
        id: claim.id,
        redemption_code: claim.voucher_code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        reward_name: promo.title,
        expires_at: claim.expires_at ?? new Date(Date.now() + 365 * 86400000).toISOString(),
        applicable_categories: promo.applicable_categories ?? [],
        source: "promo",
      });
      toast.success(`${t.booking.codeApplied}: ${promo.title}`);
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
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">{t.booking.redemptionCode}</p>
          {appliedRedemption && (
            <Badge variant="default" className="bg-accent">
              <Check className="h-3 w-3 mr-1" /> {t.common.applied}
            </Badge>
          )}
        </div>
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
