import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const MobileHero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Sahabat";

  return (
    <section className="lg:hidden relative bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground pt-3 pb-10 px-4 -mt-px">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-[11px] opacity-80 leading-none mb-1">Selamat datang 👋</p>
          <h2 className="text-base font-semibold truncate">{user ? `Halo, ${name}` : "Booking servis lebih cepat"}</h2>
        </div>
        <div className="shrink-0" />
      </div>

      <button
        onClick={() => navigate("/booking")}
        className="w-full bg-white text-foreground rounded-2xl shadow-lg flex items-center gap-3 px-4 py-3.5 active:scale-[0.99] transition"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1 text-left">Cari servis, ban, atau cabang...</span>
        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-md">Cari</span>
      </button>

      <div
        className="mobile-hero-cats flex gap-2 mt-3 overflow-x-auto -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.mobile-hero-cats::-webkit-scrollbar{display:none}`}</style>
        {["Servis Kilat", "Ganti Oli", "Tune Up", "AC Mobil", "Spooring"].map((c) => (
            <button
              key={c}
              onClick={() => navigate("/booking")}
              className="shrink-0 text-[11px] font-semibold tracking-tight px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(var(--card) / 0.25), hsl(var(--card) / 0.1))",
                backdropFilter: "blur(16px) saturate(1.6)",
                WebkitBackdropFilter: "blur(16px) saturate(1.6)",
                border: "1px solid hsl(0 100% 70% / 0.5)",
                boxShadow: "0 0 0 1px hsl(0 100% 60% / 0.15), 0 0 12px hsl(0 100% 55% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {c}
            </button>
        ))}
      </div>
    </section>
  );
};

export default MobileHero;