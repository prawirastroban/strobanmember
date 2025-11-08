import Hero from "@/components/Hero";
import ServiceReminder from "@/components/ServiceReminder";
import LoyaltyPoints from "@/components/LoyaltyPoints";
import ServiceHistory from "@/components/ServiceHistory";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your vehicle maintenance and track your rewards
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ServiceReminder />
          <LoyaltyPoints />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <ServiceHistory />
        </div>
      </main>
    </div>
  );
};

export default Index;
