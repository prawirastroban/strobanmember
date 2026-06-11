import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag, Wallet, CreditCard, Users, Car, Trophy, Tag, Building2, FileBarChart, Timer,
  Share2, Package, Truck, Wand2, Search,
} from "lucide-react";
import { CATEGORIES, reportsByCategory, ALL_REPORTS } from "./ReportRegistry";
import { useUserRole } from "@/hooks/useUserRole";
import TemplatesPanel from "./templates/TemplatesPanel";

const ICONS: Record<string, any> = {
  ShoppingBag, Wallet, CreditCard, Users, Car, Trophy, Tag, Building2, Timer, Share2, Package, Truck,
};

export default function ReportsOverview() {
  const navigate = useNavigate();
  const { canManageFinancial } = useUserRole();
  const [q, setQ] = useState("");
  const visible = CATEGORIES.filter((c) => !c.sensitive || canManageFinancial);

  const matchingReports = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return ALL_REPORTS.filter((r) => {
      const cat = CATEGORIES.find((c) => c.id === r.category);
      if (cat?.sensitive && !canManageFinancial) return false;
      return (
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        (cat?.label?.toLowerCase().includes(term) ?? false)
      );
    }).slice(0, 20);
  }, [q, canManageFinancial]);

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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari laporan…"
          className="pl-9"
        />
      </div>

      {/* Search results */}
      {q.trim() && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{matchingReports.length} laporan cocok</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchingReports.map((r) => (
              <Card key={r.id} onClick={() => navigate(`/dashboard/reports/${r.category}/${r.id}`)}
                className="cursor-pointer transition-all hover:border-primary/50">
                <CardContent className="p-3">
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Builder card */}
      <Card
        onClick={() => navigate("/dashboard/reports/builder")}
        className="cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:border-primary/50 bg-gradient-to-br from-primary/5 to-transparent"
      >
        <CardContent className="p-5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Custom Report Builder</div>
            <p className="text-xs text-muted-foreground mt-1">Buat laporan pivot sendiri: pilih data source, rows, columns, values & filters.</p>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <TemplatesPanel />

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