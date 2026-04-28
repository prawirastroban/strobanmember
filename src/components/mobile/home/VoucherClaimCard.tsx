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
      <button
        onClick={() => navigate("/promo")}
        aria-label="Lihat tiket hemat"
        className="flex items-center w-full press-tap ripple"
        style={{
          margin: "14px 16px 0",
          padding: "12px 14px",
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)",
          border: "1px solid rgba(129,140,248,0.25)",
          boxShadow: "0 4px 20px -4px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
          maxWidth: "calc(100% - 32px)",
          boxSizing: "border-box",
          gap: 12,
          textAlign: "left",
        }}
      >
        {/* Animated tag icon */}
        <div
          className="tiket-hemat-icon shrink-0 flex items-center justify-center"
          style={{ width: 40, height: 40 }}
          aria-hidden="true"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#tiketGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="tiketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
            <path d="M9.5 11.5l5 5" />
            <path d="M14.5 11.5l-5 5" />
          </svg>
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p
            className="tiket-hemat-text"
            style={{
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.06em",
              lineHeight: 1.1,
            }}
          >
            TIKET HEMAT
          </p>
          <p
            className="truncate"
            style={{ fontSize: 11, fontWeight: 500, color: "rgba(226,232,240,0.7)", marginTop: 2 }}
          >
            {topPromo ? `${topPromo.title}${available > 1 ? ` +${available - 1} lainnya` : ""}` : eyebrow}
          </p>
        </div>

        {/* CTA chip */}
        <span
          className="shrink-0"
          style={{
            background: "linear-gradient(135deg, #6366f1, #a78bfa)",
            color: "#fff",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.02em",
            boxShadow: "0 0 12px rgba(129,140,248,0.5)",
          }}
        >
          Klaim
        </span>
      </button>
    </section>
  );
};

export default VoucherClaimCard;
