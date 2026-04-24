import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import voucherIcon from "@/assets/voucher-3d.png";

const VoucherClaimCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [available, setAvailable] = useState<number>(0);
  const [myActive, setMyActive] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { count: promoCount } = await supabase
        .from("promos")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      let mine = 0;
      if (user) {
        const { count: claimCount } = await supabase
          .from("promo_claims")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active");
        mine = claimCount || 0;
      }

      if (!cancelled) {
        setAvailable(promoCount || 0);
        setMyActive(mine);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <section id="promo" className="lg:hidden mt-5 px-3">
      <button
        onClick={() => navigate("/promo")}
        className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/40 transition-all active:scale-[0.99] shadow-sm hover:shadow-md text-left"
      >
        {/* Subtle decorative gradient */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 -bottom-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />

        <div className="relative flex items-center gap-3 p-4">
          {/* 3D voucher icon */}
          <div className="shrink-0 relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-2xl" />
            <img
              src={voucherIcon}
              alt="Voucher"
              className="relative h-14 w-14 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            {available > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm ring-2 ring-card">
                {available}
              </span>
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold leading-tight">Promo & Voucher</h3>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {available > 0
                ? `${available} promo aktif siap diklaim`
                : "Belum ada promo aktif saat ini"}
            </p>
            {user && myActive > 0 ? (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {myActive} voucher Anda siap dipakai
              </p>
            ) : null}
          </div>

          {/* CTA chevron */}
          <div className="shrink-0 flex items-center gap-1">
            <span className="text-xs font-semibold text-primary hidden sm:inline">Klaim</span>
            <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </button>
    </section>
  );
};

export default VoucherClaimCard;
