import Navbar from "@/components/Navbar";
import LoyaltyPoints from "@/components/LoyaltyPoints";
import RewardsStore from "@/components/RewardsStore";
import MyVouchers from "@/components/MyVouchers";
import CashbackBalanceCard from "@/components/CashbackBalanceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Gift, Ticket, Wallet } from "lucide-react";

const Loyalty = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-4 md:py-6 max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Loyalitas, Hadiah & Voucher</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Pantau poin, tukarkan hadiah, dan kelola voucher Anda
          </p>
        </div>

        <Tabs defaultValue="loyalty" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="loyalty" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Poin
            </TabsTrigger>
            <TabsTrigger value="cashback" className="gap-1.5 text-xs">
              <Wallet className="h-3.5 w-3.5" /> Saldo
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-1.5 text-xs">
              <Gift className="h-3.5 w-3.5" /> Hadiah
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="gap-1.5 text-xs">
              <Ticket className="h-3.5 w-3.5" /> Voucher
            </TabsTrigger>
          </TabsList>
          <TabsContent value="loyalty" className="mt-4">
            <LoyaltyPoints />
          </TabsContent>
          <TabsContent value="cashback" className="mt-4">
            <CashbackBalanceCard />
          </TabsContent>
          <TabsContent value="rewards" className="mt-4">
            <RewardsStore />
          </TabsContent>
          <TabsContent value="vouchers" className="mt-4">
            <MyVouchers />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Loyalty;