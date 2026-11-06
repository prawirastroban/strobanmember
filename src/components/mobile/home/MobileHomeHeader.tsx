import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Star, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import HomeCatalogSearch from "./HomeCatalogSearch";

/** Kartu sambutan melayang ala Speedwork (Beranda HP). */
const MobileHomeHeader = () => {
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const navigate = useNavigate();
  const [points, setPoints] = useState<number | null>(null);
  const [vouchers, setVouchers] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const now = new Date().toISOString();
    Promise.all([
      supabase.from("loyalty_points").select("total_points").eq("user_id", user.id).maybeSingle(),
      supabase.from("promo_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null).gt("expires_at", now),
      supabase.from("reward_redemptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null).gt("expires_at", now),
    ]).then(([p, a, b]) => {
      if (!alive) return;
      setPoints(p.data?.total_points ?? 0);
      setVouchers((a.count ?? 0) + (b.count ?? 0));
    });
    return () => { alive = false; };
  }, [user]);

  const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "Tamu";

  return (
    <section className="relative">
      <div className="home-red-bg relative z-30 -mt-px rounded-b-[32px] px-4 pt-1 pb-12">
        <HomeCatalogSearch />
      </div>
      <div className="px-4 -mt-9 relative z-40">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-[0_12px_30px_-14px_hsl(0_0%_0%/0.25),inset_0_1px_2px_hsl(0_0%_100%/0.6)] flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground leading-tight">Selamat datang</p>
            {user ? (
              <p className="text-[14px] font-semibold text-foreground truncate leading-snug">{name}</p>
            ) : (
              <button onClick={() => openLoginDialog()} className="text-[14px] font-semibold text-primary inline-flex items-center gap-0.5 min-h-[28px]">
                Masuk / Daftar <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="h-8 w-px bg-border" aria-hidden />
          <button
            onClick={() => (user ? navigate("/loyalty") : openLoginDialog())}
            className="flex flex-col items-start min-w-[56px] min-h-[44px] justify-center"
            aria-label="Voucher saya"
          >
            <span className="text-[10px] text-muted-foreground leading-tight">Voucher</span>
            <span className="flex items-center gap-1 text-[13px] font-bold tabular-nums text-foreground">
              <Ticket className="h-3.5 w-3.5 text-primary" /> {user ? vouchers ?? "–" : 0}
            </span>
          </button>
          <button
            onClick={() => (user ? navigate("/loyalty") : openLoginDialog())}
            className="flex flex-col items-start min-w-[56px] min-h-[44px] justify-center"
            aria-label="Poin saya"
          >
            <span className="text-[10px] text-muted-foreground leading-tight">Poin</span>
            <span className="flex items-center gap-1 text-[13px] font-bold tabular-nums text-foreground">
              <Star className="h-3.5 w-3.5 text-warning fill-current" /> {user ? (points ?? "–").toLocaleString("id-ID") : 0}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default MobileHomeHeader;
