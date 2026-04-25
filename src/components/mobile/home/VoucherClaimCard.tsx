import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ActivePromo = {
  id: string;
  title: string;
  description: string | null;
  badge: string | null;
  discount_type: string;
  discount_value: number;
  ends_at: string | null;
};

const VoucherClaimCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [available, setAvailable] = useState<number>(0);
  const [myActive, setMyActive] = useState<number>(0);
  const [topPromo, setTopPromo] = useState<ActivePromo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Ambil daftar promo aktif sesuai settingan marketing di dashboard
      const nowIso = new Date().toISOString();
      const { data: promoRows, count: promoCount } = await supabase
        .from("promos")
        .select("id,title,description,badge,discount_type,discount_value,ends_at,starts_at,is_active,sort_order", { count: "exact" })
        .eq("is_active", true)
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1);

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
        setTopPromo((promoRows && promoRows[0]) ? (promoRows[0] as ActivePromo) : null);
        setLoading(false);
      }
    };
    load();

    // Realtime: update kartu saat staff mengubah promo di dashboard
    const channel = supabase
      .channel("promos-home-card")
      .on("postgres_changes", { event: "*", schema: "public", table: "promos" }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const formatDiscount = (p: ActivePromo) => {
    if (p.discount_type === "percentage") return `Diskon ${p.discount_value}%`;
    if (p.discount_type === "fixed" || p.discount_type === "amount")
      return `Potongan Rp ${new Intl.NumberFormat("id-ID").format(p.discount_value)}`;
    return p.description || "Promo spesial";
  };

  // Jangan render apa-apa jika tidak ada promo aktif (sinkron dengan dashboard)
  if (!loading && !topPromo) return null;

  const eyebrow = user && myActive > 0
    ? `${myActive} voucher aktif`
    : (topPromo?.badge || "Promo Spesial");

  const headline = topPromo
    ? `${topPromo.title}${available > 1 ? ` +${available - 1} lainnya` : ""}`
    : "Memuat promo...";

  const subline = topPromo ? formatDiscount(topPromo) : "";

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
            {eyebrow}
          </p>
          <p
            className="text-white truncate"
            style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}
          >
            {headline}
          </p>
          {subline && (
            <p
              className="text-white truncate"
              style={{ fontSize: 10.5, fontWeight: 500, marginTop: 1, opacity: 0.85 }}
            >
              {subline}
            </p>
          )}
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
