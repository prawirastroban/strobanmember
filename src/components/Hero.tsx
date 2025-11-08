import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-garage.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/70" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your Car's Best Friend
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            Never miss a service. Earn rewards with every visit. Keep your vehicle running smoothly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" variant="secondary" className="text-lg group">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg border-white text-white hover:bg-white hover:text-primary">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
