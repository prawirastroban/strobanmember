import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import BranchLocations from "@/components/BranchLocations";
import ServiceReminder from "@/components/ServiceReminder";
import LoyaltyPoints from "@/components/LoyaltyPoints";
import ServiceHistory from "@/components/ServiceHistory";
import ChatWidget from "@/components/ChatWidget";
import PushNotificationManager from "@/components/PushNotificationManager";
import { LiveProgressTracker } from "@/components/LiveProgressTracker";
import UpcomingBookings from "@/components/UpcomingBookings";
import RewardsStore from "@/components/RewardsStore";
import { useLanguage } from "@/i18n/LanguageContext";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <BranchLocations />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{t.dashboard.title}</h2>
          <p className="text-muted-foreground">
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

      <ChatWidget />
      <PushNotificationManager />
    </div>
  );
};

export default Index;
