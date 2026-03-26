import { useRef } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhyChooseUs from "@/components/WhyChooseUs";
import ServiceCatalog from "@/components/ServiceCatalog";
import StatsBanner from "@/components/StatsBanner";
import ChatWidget from "@/components/ChatWidget";
import Testimonials from "@/components/Testimonials";
import BranchLocations from "@/components/BranchLocations";
import ServiceReminder from "@/components/ServiceReminder";
import LoyaltyPoints from "@/components/LoyaltyPoints";
import ServiceHistory from "@/components/ServiceHistory";
import PushNotificationManager from "@/components/PushNotificationManager";
import { LiveProgressTracker } from "@/components/LiveProgressTracker";
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
      <Hero />
      
      {!user && (
        <>
          <StatsBanner />
          <ServiceCatalog />
          <Testimonials />
          <WhyChooseUs />
          <BranchLocations />
        </>
      )}

      {user && (
        <>
          <ServiceCatalog />

            <main className="container mx-auto px-4 py-3 md:py-6">
            <div className="mb-3">
              <h2 className="text-lg md:text-2xl font-bold mb-0.5">{t.dashboard.title}</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t.dashboard.subtitle}
              </p>
            </div>

            <div className="mb-4">
              <LiveProgressTracker />
            </div>

            <div className="mb-4">
              <UpcomingBookings />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ServiceReminder />
              <LoyaltyPoints />
            </div>

            <div className="mb-4">
              <RewardsStore />
            </div>

            <div className="mb-4">
              <ServiceHistory />
            </div>
          </main>

          <BranchLocations />
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
