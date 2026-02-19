import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-garage.jpg";

const Hero = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const handleBooking = () => {
    if (user) {
      navigate("/booking");
    } else {
      navigate("/auth?redirect=/booking");
    }
  };
  
  return (
    <section ref={ref} className="relative min-h-[400px] md:min-h-[600px] flex items-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(355_90%_54%/0.3)_0%,transparent_60%)]" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
            {t.hero.title}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 text-white/90">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg group"
              onClick={handleBooking}
            >
              {t.hero.bookService}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg border-white/70 text-white hover:bg-white hover:text-primary">
              {t.hero.learnMore}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
