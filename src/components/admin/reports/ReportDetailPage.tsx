import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, RefreshCw, FileSpreadsheet, FileDown, Loader2, FileText, Printer, Save,
  Pin, Sliders,
} from "lucide-react";
import { findReport, getCategory } from "./ReportRegistry";
import ReportFilters from "./ReportFilters";
import ReportTable from "./ReportTable";
import ReportKPIStrip from "./ReportKPIStrip";
import ReportCustomizeSheet, { applyCustomization, type ReportCustomization } from "./ReportCustomizeSheet";
import { exportToExcel } from "./exporters/exportToExcel";
import { exportToPdf } from "./exporters/exportToPdf";
import { exportToCsv } from "./exporters/exportToCsv";
import TemplateSaveDialog from "./templates/TemplateSaveDialog";
import { DEFAULT_TIMELINE, getDateRange, type TimelineValue } from "@/utils/timelineFilter";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useReportPins } from "@/hooks/useReportPins";
import { useReportTemplates } from "@/hooks/useReportTemplates";
import { formatDateID } from "@/lib/reportFormat";
import { toast } from "sonner";

export default function ReportDetailPage() {
  const { category, id } = useParams<{ category: string; id: string }>();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { brandName } = useBranding();
  const { user } = useAuth();
  const { canManageFinancial } = useUserRole();
  const { isPinned, toggle: togglePin } = useReportPins();
  const { templates, update: updateTemplate } = useReportTemplates();

  const report = id ? findReport(id) : null;
  const cat = category ? getCategory(category) : null;

  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [branch, setBranch] = useState<string>("all");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [czOpen, setCzOpen] = useState(false);
  const [customization, setCustomization] = useState<ReportCustomization>({});

  const templateId = sp.get("template");
  const editingTemplate = templates.find((t) => t.id === templateId) || null;

  // Hydrate from template config if opened with ?template=...
  useEffect(() => {
    if (!editingTemplate) return;
    const cfg = editingTemplate.config || {};
    if (cfg.timeline) setTimeline(cfg.timeline);
    if (cfg.branch) setBranch(cfg.branch);
    if (cfg.customization) setCustomization(cfg.customization);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTemplate?.id]);

  const range = useMemo(() => getDateRange(timeline), [timeline]);

  const fetchData = async () => {
    if (!report) return;
    setLoading(true);
    try {
      const data = await report.load({ start: range.start, end: range.end, branch });
      setRows(data || []);
    } catch (e: any) {
      toast.error("Gagal memuat laporan", { description: e?.message });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [id, range.start, range.end, branch]);

  if (!report || !cat) return <Navigate to="/dashboard/reports" replace />;
  if (cat.sensitive && !canManageFinancial) return <Navigate to="/dashboard/reports" replace />;

  const periodLabel = `${formatDateID(range.start)} – ${formatDateID(range.end)}`;
  const branchLabel = branch === "all" ? "Semua Cabang" : branch;

  // Apply user customization (columns/sort/filter/group) on top of registry output
  const view = useMemo(
    () => applyCustomization(report.columns, rows, customization),
    [report, rows, customization],
  );

  const onExportExcel = () => {
    exportToExcel(report.id, report.title, view.columns, view.rows, { period: periodLabel, branch: branchLabel });
    toast.success("Excel berhasil di-export");
  };
  const onExportPdf = () => {
    exportToPdf(report.id, view.columns, view.rows, {
      brandName,
      reportTitle: report.title,
      period: periodLabel,
      branch: branchLabel,
      printedBy: user?.email || undefined,
    });
    toast.success("PDF berhasil di-export");
  };
  const onExportCsv = () => {
    exportToCsv(report.id, view.columns, view.rows);
    toast.success("CSV berhasil di-export");
  };
  const onPrint = () => {
    const params = new URLSearchParams({
      preset: timeline.preset,
      ...(timeline.startDate ? { startDate: timeline.startDate } : {}),
      ...(timeline.endDate ? { endDate: timeline.endDate } : {}),
      branch,
    });
    window.open(`/dashboard/reports/print/${report.id}?${params.toString()}`, "_blank");
  };

  const kpis = report.kpis ? report.kpis(rows) : [];

  const pinId = report.id;
  const pinned = isPinned(pinId);

  const saveTemplateChanges = async () => {
    if (!editingTemplate) return;
    try {
      await updateTemplate(editingTemplate.id, {
        config: {
          ...(editingTemplate.config || {}),
          reportId: report.id,
          timeline,
          branch,
          customization,
          searchParams: new URLSearchParams({
            preset: timeline.preset,
            ...(timeline.startDate ? { startDate: timeline.startDate } : {}),
            ...(timeline.endDate ? { endDate: timeline.endDate } : {}),
            branch,
          }).toString(),
        },
      });
      toast.success("Perubahan template disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan", { description: e?.message });
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb + title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/reports/${cat.id}`)} className="-ml-2 mb-1">
            <ArrowLeft className="h-4 w-4 mr-1" /> {cat.label}
          </Button>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {report.title}
            {editingTemplate && (
              <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Template: {editingTemplate.name}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={pinned ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const now = togglePin(pinId);
              toast.success(now ? "Disematkan ke Favorit" : "Dilepas dari Favorit");
            }}
            title="Pin ke Favorit"
          >
            <Pin className={`h-4 w-4 mr-1 ${pinned ? "fill-current" : ""}`} /> Pin
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCzOpen(true)}>
            <Sliders className="h-4 w-4 mr-1" /> Kustomisasi
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {editingTemplate ? (
            <Button variant="default" size="sm" onClick={saveTemplateChanges} disabled={loading}>
              <Save className="h-4 w-4 mr-1" /> Simpan Perubahan
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)} disabled={loading}>
              <Save className="h-4 w-4 mr-1" /> Simpan Template
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onExportExcel} disabled={loading || !view.rows.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onExportCsv} disabled={loading || !view.rows.length}>
            <FileText className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPdf} disabled={loading || !view.rows.length}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint} disabled={loading || !view.rows.length}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card/60 backdrop-blur-sm p-3 sticky top-0 z-10">
        <ReportFilters
          timeline={timeline} onTimelineChange={setTimeline}
          branch={branch} onBranchChange={setBranch}
        />
        <div className="mt-2 text-xs text-muted-foreground">
          Periode: <span className="font-medium">{periodLabel}</span> · Cabang: <span className="font-medium">{branchLabel}</span>
        </div>
      </div>

      {/* KPI */}
      {!loading && kpis.length > 0 && <ReportKPIStrip kpis={kpis} />}

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border bg-card p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <ReportTable columns={view.columns} rows={view.rows} />
      )}

      <TemplateSaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        kind="standard"
        defaultName={report.title}
        config={{
          reportId: report.id,
          timeline,
          branch,
          customization,
          searchParams: new URLSearchParams({
            preset: timeline.preset,
            ...(timeline.startDate ? { startDate: timeline.startDate } : {}),
            ...(timeline.endDate ? { endDate: timeline.endDate } : {}),
            branch,
          }).toString(),
        }}
      />

      <ReportCustomizeSheet
        open={czOpen}
        onOpenChange={setCzOpen}
        columns={report.columns}
        value={customization}
        onChange={setCustomization}
      />
    </div>
  );
}