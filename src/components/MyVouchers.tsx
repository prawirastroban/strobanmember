import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Copy, Calendar, Tag, Percent, DollarSign, Loader2, Gift, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface VoucherItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  status: string;
  source: "reward" | "promo" | "referral";
  applicable_categories?: string[] | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  maintenance: "Perawatan",
  tires: "Ban",
  electrical: "Kelistrikan",
  ac: "AC",
  body: "Body",
  oil: "Oli",
  brake: "Rem",
};

const formatDiscount = (v: VoucherItem) => {
  if (v.discount_type === "percentage") return `${v.discount_value}% OFF`;
  if (v.discount_type === "free_service") return "GRATIS";
  return `Rp ${Number(v.discount_value).toLocaleString("id-ID")} OFF`;
};

const MyVouchers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const nowIso = new Date().toISOString();

    const [{ data: rwd }, { data: prm }, { data: ref }] = await Promise.all([
      supabase
        .from("reward_redemptions")
        .select("id, redemption_code, expires_at, status, used_at, rewards(name, description, discount_type, discount_value, applicable_categories)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("promo_claims")
        .select("id, voucher_code, expires_at, status, used_at, promos(title, description, discount_type, discount_value, applicable_categories)")
        .eq("user_id", user.id)
        .order("claimed_at", { ascending: false }),
      supabase
        .from("referral_vouchers")
        .select("id, code, amount, expires_at, status, used_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const fromRwd: VoucherItem[] = (rwd || []).map((r: any) => ({
      id: r.id,
      code: r.redemption_code,
      name: r.rewards?.name ?? "Reward",
      description: r.rewards?.description,
      discount_type: r.rewards?.discount_type ?? "percentage",
      discount_value: r.rewards?.discount_value ?? 0,
      expires_at: r.expires_at,
      status: r.status,
      source: "reward",
      applicable_categories: r.rewards?.applicable_categories ?? [],
    }));

    const fromPrm: VoucherItem[] = (prm || []).map((r: any) => ({
      id: r.id,
      code: r.voucher_code,
      name: r.promos?.title ?? "Voucher Promo",
      description: r.promos?.description,
      discount_type: r.promos?.discount_type ?? "percentage",
      discount_value: r.promos?.discount_value ?? 0,
      expires_at: r.expires_at,
      status: r.status,
      source: "promo",
      applicable_categories: r.promos?.applicable_categories ?? [],
    }));

    const fromRef: VoucherItem[] = (ref || []).map((r: any) => ({
      id: r.id,
      code: r.code,
      name: "Voucher Referral",
      description: "Voucher dari komisi referral",
      discount_type: "fixed",
      discount_value: Number(r.amount) || 0,
      expires_at: r.expires_at,
      status: r.status,
      source: "referral",
      applicable_categories: [],
    }));

    // Sort: active first (with nearest expiry), then used, then expired
    const all = [...fromRwd, ...fromPrm, ...fromRef];
    const isExpired = (v: VoucherItem) =>
      v.expires_at ? new Date(v.expires_at).toISOString() < nowIso : false;

    all.sort((a, b) => {
      const ra = a.status === "active" && !isExpired(a) ? 0 : a.status === "used" ? 2 : 1;
      const rb = b.status === "active" && !isExpired(b) ? 0 : b.status === "used" ? 2 : 1;
      if (ra !== rb) return ra - rb;
      const ea = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
      const eb = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
      return ea - eb;
    });

    setVouchers(all);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("my-vouchers")
      .on("postgres_changes", { event: "*", schema: "public", table: "reward_redemptions", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_claims", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_vouchers", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Kode voucher disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const useNow = (v: VoucherItem) => {
    navigate(`/booking?voucher=${encodeURIComponent(v.code)}`);
  };

  const active = vouchers.filter(
    (v) => v.status === "active" && (!v.expires_at || new Date(v.expires_at) > new Date())
  );

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base md:text-lg">Voucher Saya</CardTitle>
            <CardDescription className="text-xs">
              Voucher dari hadiah loyalti & promo yang Anda klaim. {active.length > 0 && `${active.length} aktif.`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <Gift className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Belum ada voucher.</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/promo")}>
              Lihat Promo Tersedia <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {vouchers.map((v) => {
              const expired = v.expires_at ? new Date(v.expires_at) < new Date() : false;
              const used = v.status === "used";
              const inactive = used || expired;
              return (
                <li
                  key={`${v.source}-${v.id}`}
                  className={`relative rounded-xl border p-3 transition-colors ${
                    inactive
                      ? "bg-muted/30 border-border opacity-60"
                      : "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 p-2 rounded-lg ${inactive ? "bg-muted" : "bg-primary/15"}`}>
                      {v.discount_type === "percentage" ? (
                        <Percent className={`h-4 w-4 ${inactive ? "text-muted-foreground" : "text-primary"}`} />
                      ) : (
                        <DollarSign className={`h-4 w-4 ${inactive ? "text-muted-foreground" : "text-primary"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{v.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {v.source === "reward" ? "Tukar Poin" : "Promo Diklaim"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 ${
                            inactive
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary border-primary/30 font-bold"
                          }`}
                        >
                          {formatDiscount(v)}
                        </Badge>
                      </div>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <code
                          className={`text-[11px] font-mono px-2 py-1 rounded border ${
                            inactive ? "bg-muted/50" : "bg-background border-primary/20"
                          }`}
                        >
                          {v.code}
                        </code>
                        {!inactive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => copyCode(v.code)}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Salin
                          </Button>
                        )}
                      </div>

                      {v.applicable_categories && v.applicable_categories.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {v.applicable_categories.map((c) => (
                            <Badge key={c} variant="secondary" className="text-[9px] py-0 h-4">
                              {CATEGORY_LABELS[c] || c}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {used
                            ? "Terpakai"
                            : expired
                            ? "Kadaluarsa"
                            : v.expires_at
                            ? `Berlaku s/d ${format(new Date(v.expires_at), "d MMM yyyy")}`
                            : "Tanpa batas waktu"}
                        </span>
                        {!inactive && (
                          <Button size="sm" className="h-7 px-3 text-[11px]" onClick={() => useNow(v)}>
                            Pakai
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default MyVouchers;
