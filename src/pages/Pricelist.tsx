import { ReceiptText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PricelistPage = () => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <ReceiptText className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Pricelist</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Daftar harga layanan akan tampil di sini. Sistem pricelist yang bisa
          diperbarui melalui import Excel sedang disiapkan.
        </p>
      </div>
    </CardContent>
  </Card>
);

export default PricelistPage;
