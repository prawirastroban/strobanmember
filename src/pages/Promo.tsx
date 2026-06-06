import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Clock, Users, Check, Copy, Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Navbar from "@/components/Navbar";

interface Promo {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: string;
  discount_value: number;
  terms: string | null;
  min_purchase: number;
  max_claims: number | null;
  claims_count: number;
  ends_at: string | null;
  badge: string | null;
  max_claims_per_user: number;
  reward_mode?: string;
}

interface MyClaim {
  promo_id: string;
  voucher_code: string;
  status: string;
  expires_at: string | null;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const formatDiscount = (type: string, value: number) => {
  if (type === "percentage") return `Diskon ${value}%`;
  if (type === "fixed") return `Cashback ${formatIDR(value)}`;
  if (type === "free_service") return "Layanan Gratis";
  return "Promo Spesial";
};

const formatReward = (p: { reward_mode?: string; discount_type: string; discount_value: number }) => {
  if (p.reward_mode === "cashback") {
    if (p.discount_type === "percentage") return `Cashback ${p.discount_value}% ke Saldo`;
    return `Cashback ${formatIDR(p.discount_value)} ke Saldo`;
  }
  return formatDiscount(p.discount_type, p.discount_value);
};

const Promo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [claims, setClaims] = useState<Record<string, MyClaim[]>>({});
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [detail, setDetail] = useState<Promo | null>(null);
  const [success, setSuccess] = useState<{ code: string; promo: Promo } | null>(null);

  useEffect(() => {
    load();
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    const { data: promoData } = await supabase
      .from("promos")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    setPromos((promoData as Promo[]) || []);

    if (user) {
      const { data: claimData } = await supabase
        .from("promo_claims")
        .select("promo_id, voucher_code, status, expires_at")
        .eq("user_id", user.id);
      const map: Record<string, MyClaim[]> = {};
      (claimData || []).forEach((c) => {
        const arr = map[c.promo_id] || [];
        arr.push(c as MyClaim);
        map[c.promo_id] = arr;
      });
      setClaims(map);
    }
    setLoading(false);
  };

  const handleClaim = async (promo: Promo) => {
    if (!user) {
      openLoginDialog("/promo");
      return;
    }
    setClaiming(promo.id);
    const { data, error } = await supabase.rpc("claim_promo", { _promo_id: promo.id });
    setClaiming(null);

    if (error) {
      toast.error("Gagal klaim voucher");
      return;
    }
    const result = data as { success: boolean; error?: string; voucher_code?: string };
    if (!result.success) {
      const messages: Record<string, string> = {
        already_claimed: "Anda sudah mengklaim promo ini",
        limit_per_user_reached: "Anda sudah mencapai batas klaim untuk promo ini",
        fully_claimed: "Voucher promo ini sudah habis",
        inactive_or_expired: "Promo sudah tidak aktif",
        not_authenticated: "Silakan login dulu",
      };
      toast.error(messages[result.error || ""] || "Gagal klaim voucher");
      load();
      return;
    }

    setSuccess({ code: result.voucher_code!, promo });
    setDetail(null);
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Kode voucher disalin");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container mx-auto px-4 pt-4 lg:pt-10 max-w-4xl">
        <div className="mb-5 lg:mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-1">Promo & Voucher</h1>
            <p className="text-sm text-muted-foreground">
              Penawaran terbaik dari tim Stroban — klaim sekarang sebelum habis.
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-1" />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada promo aktif saat ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {promos.map((p) => {
              const userClaims = claims[p.id] || [];
              const userClaimCount = userClaims.length;
              const lastClaim = userClaims[userClaims.length - 1];
              const perUserLimit = p.max_claims_per_user ?? 1;
              const perUserUnlimited = perUserLimit === 0;
              const reachedPerUser = !perUserUnlimited && userClaimCount >= perUserLimit;
              const claimed = userClaimCount > 0;
              const fullyClaimed = p.max_claims != null && p.claims_count >= p.max_claims;
              const remaining = p.max_claims != null ? Math.max(p.max_claims - p.claims_count, 0) : null;

              return (
                <article
                  key={p.id}
                  className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/40 transition-all"
                >
                  {/* Top accent strip */}
                  <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span className="text-sm font-bold tracking-wide">
                        {formatReward(p)}
                      </span>
                    </div>
                    {p.badge ? (
                      <Badge variant="secondary" className="text-[10px] bg-background/20 text-primary-foreground border-0">
                        {p.badge}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-base leading-tight mb-1">{p.title}</h3>
                    {p.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-3">
                      {p.ends_at ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          s/d {format(new Date(p.ends_at), "d MMM yyyy", { locale: idLocale })}
                        </span>
                      ) : null}
                      {remaining != null ? (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {remaining > 0 ? `${remaining} kuota tersisa` : "Habis"}
                        </span>
                      ) : null}
                      {perUserLimit !== 1 ? (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {perUserUnlimited
                            ? "Bisa klaim berkali-kali"
                            : `Maks ${perUserLimit}× per akun`}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDetail(p)}
                      >
                        Lihat Detail
                      </Button>
                      {claimed && reachedPerUser ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => lastClaim && copyCode(lastClaim.voucher_code)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {lastClaim?.voucher_code}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={fullyClaimed || claiming === p.id}
                          onClick={() => handleClaim(p)}
                        >
                          {claiming === p.id
                            ? "Memproses..."
                            : fullyClaimed
                              ? "Habis"
                              : claimed
                                ? "Klaim Lagi"
                                : "Klaim"}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{detail.title}</DialogTitle>
                <DialogDescription>{formatDiscount(detail.discount_type, detail.discount_value)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {detail.description ? <p className="text-muted-foreground">{detail.description}</p> : null}
                {detail.min_purchase > 0 ? (
                  <div className="rounded-lg bg-muted px-3 py-2 text-xs">
                    Minimum transaksi: <span className="font-semibold">{formatIDR(detail.min_purchase)}</span>
                  </div>
                ) : null}
                {detail.terms ? (
                  <div>
                    <p className="font-semibold text-xs uppercase tracking-wide mb-1">Syarat & Ketentuan</p>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground leading-relaxed">
                      {detail.terms}
                    </pre>
                  </div>
                ) : null}
                {detail.ends_at ? (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Berlaku hingga {format(new Date(detail.ends_at), "d MMMM yyyy", { locale: idLocale })}
                  </p>
                ) : null}
              </div>
              <Button
                size="lg"
                className="w-full mt-2"
                disabled={
                  claiming === detail.id ||
                  (() => {
                    const list = claims[detail.id] || [];
                    const lim = detail.max_claims_per_user ?? 1;
                    return lim !== 0 && list.length >= lim;
                  })()
                }
                onClick={() => handleClaim(detail)}
              >
                {claiming === detail.id
                  ? "Memproses..."
                  : (() => {
                      const list = claims[detail.id] || [];
                      const lim = detail.max_claims_per_user ?? 1;
                      if (lim !== 0 && list.length >= lim) return "Sudah Diklaim";
                      return list.length > 0 ? "Klaim Lagi" : "Klaim Voucher";
                    })()}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={!!success} onOpenChange={(o) => !o && setSuccess(null)}>
        <DialogContent className="max-w-sm text-center">
          {success ? (
            <>
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Check className="h-7 w-7" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-center">Voucher Berhasil Diklaim!</DialogTitle>
                <DialogDescription className="text-center">
                  Tunjukkan kode ini saat melakukan booking atau pembayaran.
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Kode Voucher</p>
                <p className="text-xl font-bold tracking-wider text-primary">{success.code}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => copyCode(success.code)}>
                  <Copy className="h-4 w-4 mr-1" /> Salin
                </Button>
                <Button className="flex-1" onClick={() => { setSuccess(null); navigate("/booking"); }}>
                  Booking Sekarang
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Promo;