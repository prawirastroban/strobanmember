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
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <StatsBanner />
      <ServiceCatalog />
      <Testimonials />
      <WhyChooseUs />
      <BranchLocations />

      {user && (
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">{t.dashboard.title}</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {t.dashboard.subtitle}
            </p>
          </div>

          <div className="mb-6">
            <LiveProgressTracker />
          </div>

          <div className="mb-6">
            <UpcomingBookings />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ServiceReminder />
            <LoyaltyPoints />
          </div>

          <div className="mb-6">
            <RewardsStore />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <ServiceHistory />
          </div>
        </main>
      )}

      <ChatWidget />
      {user && <PushNotificationManager />}
      <WhatsAppButton />
      <Footer />
    </div>
  );
};

export default Index;
