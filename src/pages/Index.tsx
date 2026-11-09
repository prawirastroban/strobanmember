import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhyChooseUs from "@/components/WhyChooseUs";
import ServiceCatalog from "@/components/ServiceCatalog";
import TireCatalogSection from "@/components/TireCatalogSection";
import StatsBanner from "@/components/StatsBanner";
import Testimonials from "@/components/Testimonials";
import HeroBookingForm from "@/components/mobile/home/HeroBookingForm";
import MobileHomeHeader from "@/components/mobile/home/MobileHomeHeader";
import PromoCarousel from "@/components/mobile/PromoCarousel";
import ServiceCategoryGrid from "@/components/mobile/home/ServiceCategoryGrid";
import AccountChecklistCard from "@/components/mobile/home/AccountChecklistCard";
import TrustStrip from "@/components/mobile/home/TrustStrip";
import HowToBook from "@/components/mobile/home/HowToBook";
import ServiceHistory from "@/components/ServiceHistory";
import PushNotificationManager from "@/components/PushNotificationManager";
import Footer from "@/components/Footer";
import PromoPopupManager from "@/components/PromoPopupManager";

import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => { 
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showKonsultasi, setShowKonsultasi] = useState(false);

  // Searchbar "Apa masalah mobil anda ?" mem-broadcast event ini.
  useEffect(() => {
    const handler = () => setShowKonsultasi((v) => !v);
    window.addEventListener("toggle-konsultasi", handler);
    return () => window.removeEventListener("toggle-konsultasi", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 web-glass">
      <Navbar homeHero />
      <main id="main">
      {/* Desktop hero (hidden on mobile/tablet) */}
      <div className="hidden lg:block">
        <Hero />
      </div>

      {/* Mobile/tablet homepage — Urban-style booking flow */}
      <div className="home-canvas lg:hidden" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
        <MobileHomeHeader />
        <ServiceCategoryGrid />
        <div className="home-glass-sheet">
          <PromoCarousel />
          {user && <AccountChecklistCard />}
          <TrustStrip />
          <HowToBook />
          <Testimonials />
          <Footer embedded />
        </div>
      </div>

      {!user && (
        <div className="hidden lg:block">
          <StatsBanner />
          <ServiceCatalog />
          <WhyChooseUs />
        </div>
      )}

      {user && (
        <>
          <div className="hidden lg:block">
            <ServiceCatalog />
          </div>
        </>
      )}

      {/* Testimonials lalu Cabang — selalu paling bawah */}
      <div className="hidden lg:block"><Testimonials /></div>

      {user && <PushNotificationManager />}
      <PromoPopupManager />
      </main>
      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
};

export default Index;
