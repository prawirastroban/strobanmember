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
import MobileHero from "@/components/mobile/MobileHero";
import QuickCategoryGrid from "@/components/mobile/QuickCategoryGrid";
import PromoCarousel from "@/components/mobile/PromoCarousel";
import MobileServiceList from "@/components/mobile/MobileServiceList";
import MobileBranchPicker from "@/components/mobile/MobileBranchPicker";
import LoyaltyPoints from "@/components/LoyaltyPoints";
import ServiceHistory from "@/components/ServiceHistory";
import PushNotificationManager from "@/components/PushNotificationManager";
import UpcomingBookings from "@/components/UpcomingBookings";
import RewardsStore from "@/components/RewardsStore";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

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

      {/* Traveloka-style mobile/tablet experience */}
      <div className="lg:hidden">
        <MobileHero />
        <QuickCategoryGrid />
        <PromoCarousel />
        <MobileServiceList />
        <TireCatalogSection />
        <MobileBranchPicker />
      </div>

      {!user && (
        <div className="hidden lg:block">
          <StatsBanner />
          <ServiceCatalog />
          <TireCatalogSection />
          <Testimonials />
          <WhyChooseUs />
          <BranchLocations />
        </div>
      )}

      {user && (
        <>
          <div className="hidden lg:block">
            <ServiceCatalog />
            <TireCatalogSection />
          </div>

            <main className="container mx-auto px-4 py-3 md:py-6">
            <div className="mb-3">
              <h2 className="text-lg md:text-2xl font-bold mb-0.5">{t.dashboard.title}</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t.dashboard.subtitle}
              </p>
            </div>

            <div className="mb-3">
              <UpcomingBookings />
            </div>

            <div className="mb-3">
              <LoyaltyPoints />
            </div>

            <div className="mb-3">
              <RewardsStore />
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
      <WhatsAppButton />
      <Footer />
    </div>
  );
};

export default Index;
