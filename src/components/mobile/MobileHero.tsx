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
    </section>
  );
};

export default MobileHero;