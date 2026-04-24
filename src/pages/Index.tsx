import { useRef } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhyChooseUs from "@/components/WhyChooseUs";
import ServiceCatalog from "@/components/ServiceCatalog";
import TireCatalogSection from "@/components/TireCatalogSection";
import StatsBanner from "@/components/StatsBanner";
import ChatWidget from "@/components/ChatWidget";
import Testimonials from "@/components/Testimonials";
import BranchLocations from "@/components/BranchLocations";
import HeroBookingForm from "@/components/mobile/home/HeroBookingForm";
import PromoCarousel from "@/components/mobile/PromoCarousel";
import PopularServices from "@/components/mobile/home/PopularServices";
import QuickRebook from "@/components/mobile/home/QuickRebook";
import TrustStrip from "@/components/mobile/home/TrustStrip";
import BranchList from "@/components/mobile/home/BranchList";
import MiniTestimonials from "@/components/mobile/home/MiniTestimonials";
import BottomCTA from "@/components/mobile/home/BottomCTA";
import ServiceHistory from "@/components/ServiceHistory";
import PushNotificationManager from "@/components/PushNotificationManager";
import Footer from "@/components/Footer";

import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => { 
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      {/* Desktop hero (hidden on mobile/tablet) */}
      <div className="hidden lg:block">
        <Hero />
      </div>

      {/* Mobile/tablet homepage — Urban-style booking flow */}
      <div className="lg:hidden">
        <HeroBookingForm />
        <PromoCarousel />
        <PopularServices />
        <QuickRebook />
        <TrustStrip />
        <BranchList />
        <MiniTestimonials />
        <BottomCTA />
      </div>

      {!user && (
        <div className="hidden lg:block">
          <StatsBanner />
          <ServiceCatalog />
          <Testimonials />
          <WhyChooseUs />
          <BranchLocations />
        </div>
      )}

      {user && (
        <>
          <div className="hidden lg:block">
            <ServiceCatalog />
          </div>

            <main className="container mx-auto px-4 py-3 md:py-6">
            <div className="mb-3">
              <h2 className="text-lg md:text-2xl font-bold mb-0.5">{t.dashboard.title}</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t.dashboard.subtitle}
              </p>
            </div>

            <div className="mb-3">
              <ServiceHistory />
            </div>
          </main>

          <div className="hidden lg:block">
            <BranchLocations />
          </div>
        </>
      )}

      <ChatWidget />
      {user && <PushNotificationManager />}
      <Footer />
    </div>
  );
};

export default Index;
