import { Button } from "@/components/ui/button";
import { MessageCircle, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-garage.jpg";

const WHATSAPP_NUMBER = "628973700800";
const PHONE_NUMBER = "+628973700800";

const Hero = () => {
  const { user } = useAuth();

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Halo, saya ingin booking servis mobil")}`;

  return (
    <section className={`relative flex items-center overflow-hidden ${user ? "min-h-[200px] md:min-h-[280px]" : "min-h-[420px] md:min-h-[600px]"}`}>
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(355_90%_54%/0.3)_0%,transparent_60%)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl text-white">
          <h1 className={`font-bold leading-tight ${user ? "text-2xl sm:text-3xl md:text-4xl mb-2 md:mb-3" : "text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 md:mb-4"}`}>
            Servis Mobil Cepat Tanpa Antri
          </h1>
          <p className={`text-white/90 ${user ? "text-sm sm:text-base md:text-lg mb-3 md:mb-4" : "text-base sm:text-lg md:text-xl mb-3 md:mb-4"}`}>
            Selesai &lt; 1 Jam • Teknisi Profesional • Harga Transparan
          </p>

          {!user && (
            <>
              <div className="mb-3 md:mb-4">
                <span className="inline-block bg-secondary text-secondary-foreground font-bold text-sm sm:text-base md:text-lg px-4 py-2 rounded-full animate-pulse">
                  👉 GRATIS pengecekan kendaraan hari ini
                </span>
              </div>


              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  asChild
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-base sm:text-lg font-bold shadow-lg"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    WhatsApp Sekarang
                  </a>
                </Button>
                <Button
                  size="lg"
                  asChild
                  variant="outline"
                  className="border-white/70 text-white hover:bg-white hover:text-primary text-base sm:text-lg font-bold"
                >
                  <a href={`tel:${PHONE_NUMBER}`}>
                    <Phone className="mr-2 h-5 w-5" />
                    Telepon
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
