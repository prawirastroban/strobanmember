import { Button } from "@/components/ui/button";
import { MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-garage.jpg";

const WHATSAPP_NUMBER = "628973700800";
const PHONE_NUMBER = "+628973700800";

const Hero = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t.hero.whatsappMessage)}`;

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
          {/* Emoji car icon */}
          <span className="text-4xl md:text-5xl mb-3 block">🚗</span>

          <h1 className={`font-bold leading-tight ${user ? "text-2xl sm:text-3xl md:text-4xl mb-2 md:mb-3" : "text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 md:mb-5"}`}>
            {t.hero.title}
          </h1>

          {/* USP pills */}
          <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-5">
            {[t.hero.usp1, t.hero.usp2, t.hero.usp3].map((usp, i) => (
              <span key={i} className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full">
                {usp}
              </span>
            ))}
          </div>

          {/* Free check CTA */}
          <p className="text-base sm:text-lg md:text-xl font-semibold text-secondary mb-6 md:mb-8">
            👉 {t.hero.freeCheck}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="text-base sm:text-lg group font-bold"
              asChild
            >
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                {t.hero.whatsappNow}
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base sm:text-lg border-white/70 text-white hover:bg-white hover:text-primary font-bold"
              asChild
            >
              <a href={`tel:${PHONE_NUMBER}`}>
                <Phone className="mr-2 h-5 w-5" />
                {t.hero.callNow}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
