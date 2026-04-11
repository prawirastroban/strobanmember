import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowLeft, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CheckoutComingSoon = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Log visit
    const logVisit = async () => {
      try {
        await supabase.from("activity_logs").insert({
          type: "checkout",
          description: "User visited checkout coming soon page",
          user_id: user?.id ?? null,
        });
      } catch {}
    };
    logVisit();
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(220 14% 14%) 50%, hsl(var(--background)) 100%)" }}
    >
      {/* Floating orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] -top-40 -left-40 animate-pulse" style={{ background: "hsl(var(--primary) / 0.4)" }} />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] -bottom-32 -right-32 animate-pulse" style={{ background: "hsl(var(--secondary) / 0.3)", animationDelay: "1s" }} />
      <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] top-1/3 right-1/4 animate-pulse" style={{ background: "hsl(var(--primary) / 0.3)", animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Glass card */}
        <div
          className="rounded-3xl p-8 md:p-12 text-center space-y-6 transition-all duration-500 hover:shadow-2xl"
          style={{
            background: "hsl(var(--card) / 0.6)",
            backdropFilter: "blur(24px) saturate(1.5)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
            border: "1px solid hsl(var(--border) / 0.3)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
          }}
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center transition-transform duration-700 hover:scale-110"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.15))",
                border: "1px solid hsl(var(--primary) / 0.2)",
                animation: "float 3s ease-in-out infinite",
              }}
            >
              <Rocket className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Checkout Feature Coming Soon 🚀
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Kami lagi siapin sistem checkout biar makin cepat, praktis, dan powerful.
            </p>
          </div>

          {/* Status badge */}
          <div className="flex justify-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: "hsl(var(--primary) / 0.1)",
                border: "1px solid hsl(var(--primary) / 0.2)",
                color: "hsl(var(--primary))",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Lagi dimasak biar perfect 🔥
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="flex-1 gap-2 font-semibold"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Katalog
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 font-semibold"
              onClick={() => {
                navigate("/");
                setTimeout(() => {
                  document.getElementById("tire-catalog")?.scrollIntoView({ behavior: "smooth" });
                }, 300);
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              Lihat Ban Lain
            </Button>
          </div>

          {/* Small note */}
          <p className="text-xs text-muted-foreground/70 pt-2 leading-relaxed">
            Fitur ini akan segera tersedia untuk mempermudah pembelian ban langsung dari website.
          </p>
        </div>
      </div>

      {/* Float keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default CheckoutComingSoon;
