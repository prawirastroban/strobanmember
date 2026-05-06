import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingBag, Wallet, CreditCard, Users, Car, Trophy, Tag, Building2, FileBarChart,
} from "lucide-react";
import { CATEGORIES, reportsByCategory } from "./ReportRegistry";
import { useUserRole } from "@/hooks/useUserRole";

const ICONS: Record<string, any> = {
  ShoppingBag, Wallet, CreditCard, Users, Car, Trophy, Tag, Building2,
};

export default function ReportsOverview() {
  const navigate = useNavigate();
  const { canManageFinancial } = useUserRole();
  const visible = CATEGORIES.filter((c) => !c.sensitive || canManageFinancial);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FileBarChart className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Daftar Laporan</h2>
          <p className="text-sm text-muted-foreground">Pilih kategori untuk melihat laporan analitik dan ekspor data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((c) => {
          const Icon = ICONS[c.icon] || FileBarChart;
          const count = reportsByCategory(c.id).length;
          return (
            <Card
              key={c.id}
              onClick={() => navigate(`/dashboard/reports/${c.id}`)}
              className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:border-primary/50"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{c.label}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    <div className="text-xs text-primary mt-2">{count} laporan tersedia</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}