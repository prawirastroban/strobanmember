import { Search, Bell, MapPin } from "lucide-react";
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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/#cabang")}
            className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition"
            aria-label="Cabang"
          >
            <MapPin className="h-4 w-4" />
          </button>
          {user && (
            <button
              onClick={() => navigate("/profile")}
              className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition"
              aria-label="Notifikasi"
            >
              <Bell className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate("/booking")}
        className="w-full bg-white text-foreground rounded-2xl shadow-lg flex items-center gap-3 px-4 py-3.5 active:scale-[0.99] transition"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1 text-left">Cari servis, ban, atau cabang...</span>
        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-md">Cari</span>
      </button>

      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none -mx-4 px-4">
        {["Servis Kilat", "Ganti Oli", "Tune Up", "AC Mobil", "Spooring"].map((c) => (
          <button
            key={c}
            onClick={() => navigate("/booking")}
            className="shrink-0 text-xs font-medium bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 rounded-full transition"
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
};

export default MobileHero;