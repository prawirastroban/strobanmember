import { ReceiptText } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";

const PricelistPage = () => (
  <div className="min-h-screen bg-background pb-24">
    <Navbar />
    <div className="container mx-auto px-4 pt-6 lg:pt-10 max-w-4xl">
      <div className="mb-5 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-1">Pricelist</h1>
        <p className="text-sm text-muted-foreground">
          Daftar harga layanan Bengkel Mobil Stroban.
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <ReceiptText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Segera Hadir</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Daftar harga layanan akan tampil di sini. Sistem pricelist yang bisa
              diperbarui melalui import Excel sedang disiapkan.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default PricelistPage;
