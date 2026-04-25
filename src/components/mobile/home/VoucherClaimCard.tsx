import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    <section id="promo" className="lg:hidden" style={{ maxWidth: "100%", boxSizing: "border-box" }}>
      <div
        className="flex items-center justify-between"
        style={{
          margin: "14px 16px 0",
          padding: "12px 14px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #E53935, #c62828)",
          maxWidth: "calc(100% - 32px)",
          boxSizing: "border-box",
        }}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p
            className="uppercase text-white"
            style={{ fontSize: 9, fontWeight: 600, opacity: 0.7, letterSpacing: "0.08em" }}
          >
            {user && myActive > 0 ? `${myActive} voucher aktif` : "Promo Spesial"}
          </p>
          <p
            className="text-white truncate"
            style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}
          >
            {available > 0
              ? `${available} promo aktif siap diklaim`
              : "Belum ada promo aktif"}
          </p>
        </div>
        <button
          onClick={() => navigate("/promo")}
          className="text-white shrink-0"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            minHeight: 44,
            minWidth: 64,
          }}
          aria-label="Klaim promo"
        >
          Klaim
        </button>
      </div>
    </section>
  );
};

export default VoucherClaimCard;
