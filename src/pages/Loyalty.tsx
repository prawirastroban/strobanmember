import Navbar from "@/components/Navbar";
import LoyaltyPoints from "@/components/LoyaltyPoints";
import RewardsStore from "@/components/RewardsStore";

const Loyalty = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-4 md:py-6 max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Loyalitas & Hadiah</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Pantau poin Anda dan tukarkan dengan diskon menarik
          </p>
        </div>
        <LoyaltyPoints />
        <RewardsStore />
      </main>
    </div>
  );
};

export default Loyalty;