import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Trash2, Layout } from "lucide-react";
import { useReportTemplates } from "@/hooks/useReportTemplates";
import { findReport } from "../ReportRegistry";
import { toast } from "sonner";

export default function TemplatesPanel() {
  const navigate = useNavigate();
  const { templates, loading, remove, duplicate, toggleFavorite } = useReportTemplates();

  if (loading) return null;
  if (!templates.length) return null;

  const open = (t: any) => {
    if (t.kind === "builder") {
      navigate(`/dashboard/reports/builder?template=${t.id}`);
    } else {
      const reportId = t.config?.reportId;
      const r = reportId ? findReport(reportId) : null;
      if (!r) { toast.error("Laporan dari template tidak ditemukan"); return; }
      const qs = t.config?.searchParams ? `?${t.config.searchParams}` : "";
      navigate(`/dashboard/reports/${r.category}/${r.id}${qs}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layout className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Template Saya</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((t) => (
          <Card key={t.id} className="transition-all hover:border-primary/50">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => open(t)} className="flex-1 text-left">
                  <div className="font-medium line-clamp-1">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{t.kind}</Badge>
                    {t.is_global && <Badge variant="secondary" className="text-[10px]">global</Badge>}
                  </div>
                </button>
                <Button size="icon" variant="ghost" onClick={() => toggleFavorite(t.id)}>
                  <Star className={`h-4 w-4 ${t.is_favorite ? "fill-primary text-primary" : ""}`} />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => open(t)}>Buka</Button>
                <Button size="icon" variant="outline" onClick={() => duplicate(t.id)} title="Duplikat">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="outline" onClick={async () => {
                  if (!confirm(`Hapus template "${t.name}"?`)) return;
                  try { await remove(t.id); toast.success("Template dihapus"); }
                  catch (e: any) { toast.error("Gagal", { description: e?.message }); }
                }} title="Hapus">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}