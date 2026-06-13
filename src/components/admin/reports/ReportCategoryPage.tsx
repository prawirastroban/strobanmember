import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft, FileText } from "lucide-react";
import { CATEGORIES, getCategory, reportsByCategory } from "./ReportRegistry";
import { useUserRole } from "@/hooks/useUserRole";

export default function ReportCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { canManageFinancial } = useUserRole();

  const cat = category ? getCategory(category) : null;
  if (!cat) return <Navigate to="/dashboard/reports" replace />;
  if (cat.sensitive && !canManageFinancial) return <Navigate to="/dashboard/reports" replace />;

  const reports = reportsByCategory(cat.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/reports")} className="-ml-2 mb-1">
            <ArrowLeft className="h-4 w-4 mr-1" /> Daftar Laporan
          </Button>
          <h2 className="text-lg font-semibold">{cat.label}</h2>
          <p className="text-sm text-muted-foreground">{cat.description}</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          Belum ada laporan pada kategori ini. Segera hadir.
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card
            key={r.id}
            onClick={() => navigate(`/dashboard/reports/${cat.id}/${r.id}`)}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.title}</div>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}