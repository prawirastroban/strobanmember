import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Tag, Loader2, X, Percent, DollarSign, Ticket, BadgePercent, ArrowRight } from "lucide-react";
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
  applicable_service_ids?: string[] | null;
  source?: "reward" | "promo";
}

interface RedemptionCodeInputProps {
  userId: string | undefined;
  onRedemptionApplied: (redemption: RedemptionData | null) => void;
  appliedRedemption: RedemptionData | null;
  /** Kategori layanan yang dipilih user. */
  selectedServiceCategories?: string[];
  /** ID layanan spesifik yang dipilih user. */
  selectedServiceIds?: string[];
}

/**
 * Voucher eligible jika tidak ada batasan sama sekali (kategori & layanan
 * spesifik kosong = "Semua Layanan"), atau jika minimal satu batasan cocok
 * dengan pilihan user. Jika user belum memilih apa-apa, anggap eligible
 * (final check terjadi saat apply).
 */
const isVoucherEligible = (
  applicableCategories: string[] | null | undefined,
  applicableServiceIds: string[] | null | undefined,
  selectedCategories: string[] | undefined,
  selectedServiceIds: string[] | undefined,
) => {
  const cats = applicableCategories ?? [];
  const svcs = applicableServiceIds ?? [];
  if (cats.length === 0 && svcs.length === 0) return true;
  const selCats = selectedCategories ?? [];
  const selSvcs = selectedServiceIds ?? [];
  if (selCats.length === 0 && selSvcs.length === 0) return true;
  const svcMatch = svcs.length > 0 && selSvcs.some((id) => svcs.includes(id));
  const catMatch = cats.length > 0 && selCats.some((c) => cats.includes(c));
  return svcMatch || catMatch;
};

const RedemptionCodeInput = ({
  userId,
  onRedemptionApplied,
  appliedRedemption,
  selectedServiceCategories = [],
  selectedServiceIds = [],
}: RedemptionCodeInputProps) => {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [availableCodes, setAvailableCodes] = useState<RedemptionData[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const autoAppliedIdRef = useRef<string | null>(null);
  const { t } = useLanguage();

  const fetchAllCodes = async (): Promise<RedemptionData[]> => {
    if (!userId) return [];
    // 1) Reward redemption codes
    const { data: rwdData, error: rwdErr } = await supabase
      .from("reward_redemptions")
      .select(`id, redemption_code, expires_at, status, rewards (name, discount_type, discount_value, applicable_categories, applicable_service_ids)`)
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
      applicable_service_ids: r.rewards?.applicable_service_ids ?? [],
      source: "reward" as const,
    }));

    // 2) Promo voucher claims
    const { data: pcData, error: pcErr } = await supabase
      .from("promo_claims")
      .select(`id, voucher_code, expires_at, status, promos (title, discount_type, discount_value, applicable_categories, applicable_service_ids)`)
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
        applicable_service_ids: r.promos?.applicable_service_ids ?? [],
        source: "promo" as const,
      }));
    return [...rewardCodes, ...promoCodes];
  };

  const loadAvailableCodes = async () => {
    if (!userId) { toast.error(t.booking.signInForCodes); return; }
    setLoadingCodes(true);
    try {
      const all = await fetchAllCodes();
      const merged = all.filter((c) =>
        isVoucherEligible(
          c.applicable_categories,
          c.applicable_service_ids,
          selectedServiceCategories,
          selectedServiceIds,
        )
      );
      setAvailableCodes(merged);
    } catch (err) {
      console.error("Load codes error:", err);
      toast.error(t.booking.failedValidate);
    } finally {
      setLoadingCodes(false);
    }
  };

  // Stable signature for the selected service deps
  const selSig = useMemo(
    () => `${[...selectedServiceCategories].sort().join(",")}|${[...selectedServiceIds].sort().join(",")}`,
    [selectedServiceCategories, selectedServiceIds],
  );

  // Score voucher: prefer specific-service match > category match > generic; tie-break by larger value
  const scoreVoucher = (v: RedemptionData) => {
    const svcs = v.applicable_service_ids ?? [];
    const cats = v.applicable_categories ?? [];
    const specificMatch = svcs.length > 0 && selectedServiceIds.some((id) => svcs.includes(id));
    const catMatch = cats.length > 0 && selectedServiceCategories.some((c) => cats.includes(c));
    let base = 0;
    if (specificMatch) base = 300;
    else if (catMatch) base = 200;
    else if (svcs.length === 0 && cats.length === 0) base = 100;
    // Normalize discount weight
    const dv = v.discount_type === "percentage" ? v.discount_value : v.discount_value / 1000;
    return base + dv;
  };

  // Auto-load eligible vouchers and auto-apply best one when service selection changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!userId) return;
      try {
        const all = await fetchAllCodes();
        if (cancelled) return;
        const eligible = all.filter((c) =>
          isVoucherEligible(c.applicable_categories, c.applicable_service_ids, selectedServiceCategories, selectedServiceIds),
        );
        setAvailableCodes(eligible);
        setAutoLoaded(true);

        // If an applied voucher is no longer eligible, drop it
        if (appliedRedemption && !isVoucherEligible(appliedRedemption.applicable_categories, appliedRedemption.applicable_service_ids, selectedServiceCategories, selectedServiceIds)) {
          onRedemptionApplied(null);
          autoAppliedIdRef.current = null;
        }

        // Auto-apply best voucher if:
        // - nothing applied yet, OR
        // - the currently applied voucher was auto-applied (so we can switch to a better one)
        const canAutoSwitch = !appliedRedemption || autoAppliedIdRef.current === appliedRedemption.id;
        if (canAutoSwitch && eligible.length > 0 && (selectedServiceIds.length > 0 || selectedServiceCategories.length > 0)) {
          const best = [...eligible].sort((a, b) => scoreVoucher(b) - scoreVoucher(a))[0];
          if (best && best.id !== appliedRedemption?.id) {
            onRedemptionApplied(best);
            autoAppliedIdRef.current = best.id;
          }
        }
      } catch (err) {
        console.error("Auto load codes error:", err);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selSig]);

  const applyFromList = (r: RedemptionData) => {
    if (!isVoucherEligible(r.applicable_categories, r.applicable_service_ids, selectedServiceCategories, selectedServiceIds)) {
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
        .select(`id, redemption_code, expires_at, status, user_id, rewards (name, discount_type, discount_value, applicable_categories, applicable_service_ids)`)
        .eq("redemption_code", upper)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (error) { console.error("Redemption lookup error:", error); toast.error(t.booking.failedValidate); return; }

      if (redemption) {
        if (new Date(redemption.expires_at) < new Date()) { toast.error(t.booking.expiredCode); return; }
        const reward = redemption.rewards as { name: string; discount_type: string; discount_value: number; applicable_categories?: string[]; applicable_service_ids?: string[] } | null;
        if (!reward) { toast.error(t.booking.rewardNotFound); return; }
        if (!isVoucherEligible(reward.applicable_categories, reward.applicable_service_ids, selectedServiceCategories, selectedServiceIds)) {
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
          applicable_service_ids: reward.applicable_service_ids ?? [],
          source: "reward",
        });
        toast.success(`${t.booking.codeApplied}: ${reward.name}`);
        return;
      }

      // Fallback: try promo_claims voucher code
      const { data: claim, error: cErr } = await supabase
        .from("promo_claims")
        .select(`id, voucher_code, expires_at, status, promos (title, discount_type, discount_value, applicable_categories, applicable_service_ids)`)
        .eq("voucher_code", upper)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (cErr) { console.error("Promo claim lookup error:", cErr); toast.error(t.booking.failedValidate); return; }
      if (!claim) { toast.error(t.booking.invalidCode); return; }
      if (claim.expires_at && new Date(claim.expires_at) < new Date()) { toast.error(t.booking.expiredCode); return; }
      const promo = claim.promos as { title: string; discount_type: string; discount_value: number; applicable_categories?: string[]; applicable_service_ids?: string[] } | null;
      if (!promo) { toast.error(t.booking.rewardNotFound); return; }
      if (!isVoucherEligible(promo.applicable_categories, promo.applicable_service_ids, selectedServiceCategories, selectedServiceIds)) {
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
        applicable_service_ids: promo.applicable_service_ids ?? [],
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
    autoAppliedIdRef.current = null;
    onRedemptionApplied(null);
    toast.info(t.booking.codeRemoved);
  };

  const bestRecommendation = useMemo(() => {
    if (availableCodes.length === 0) return null;
    return [...availableCodes].sort((a, b) => scoreVoucher(b) - scoreVoucher(a))[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCodes, selSig]);

  const formatDiscount = (r: RedemptionData) =>
    r.discount_type === "percentage"
      ? `${r.discount_value}% off`
      : `Rp ${r.discount_value.toLocaleString("id-ID")} off`;

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
        ) : bestRecommendation && !showManualInput ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-background shadow-sm">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <BadgePercent className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug truncate">{bestRecommendation.reward_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Promo terbaik untukmu</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-5"
                onClick={() => {
                  onRedemptionApplied(bestRecommendation);
                  autoAppliedIdRef.current = bestRecommendation.id;
                  toast.success(`${t.booking.codeApplied}: ${bestRecommendation.reward_name}`);
                }}
              >
                Pakai
              </Button>
            </div>
            <button
              type="button"
              onClick={() => { setPopoverOpen(true); setShowManualInput(true); }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              <span>Cek promo lainnya</span>
              <ArrowRight className="h-4 w-4" />
            </button>
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
                                    {formatDiscount(r)}
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
