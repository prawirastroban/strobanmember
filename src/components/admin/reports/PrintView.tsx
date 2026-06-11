import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { findReport } from "./ReportRegistry";
import { getDateRange, type TimelineValue, DEFAULT_TIMELINE } from "@/utils/timelineFilter";
import { useBranding } from "@/hooks/useBranding";
import { formatDateID, formatRupiah, formatNumber, formatDateTimeID } from "@/lib/reportFormat";

const formatCell = (val: any, fmt?: string): string => {
  if (val === null || val === undefined || val === "") return "-";
  switch (fmt) {
    case "currency": return formatRupiah(Number(val) || 0);
    case "number": return formatNumber(Number(val) || 0);
    case "date": return formatDateID(val);
    case "datetime": return formatDateTimeID(val);
    case "percent": return `${Number(val).toFixed(1)}%`;
    default: return String(val);
  }
};

export default function PrintView() {
  const { id } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const report = id ? findReport(id) : null;
  const { brandName } = useBranding();

  const timeline: TimelineValue = {
    preset: (sp.get("preset") as any) || DEFAULT_TIMELINE.preset,
    startDate: sp.get("startDate") || undefined,
    endDate: sp.get("endDate") || undefined,
  } as any;
  const branch = sp.get("branch") || "all";

  const range = useMemo(() => getDateRange(timeline), [sp]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!report) return;
    (async () => {
      const data = await report.load({ start: range.start, end: range.end, branch });
      setRows(data || []);
      setLoading(false);
      setTimeout(() => window.print(), 400);
    })();
  }, [report, range.start, range.end, branch]);

  if (!report) return <Navigate to="/dashboard/reports" replace />;

  const periodLabel = `${formatDateID(range.start)} – ${formatDateID(range.end)}`;
  const branchLabel = branch === "all" ? "Semua Cabang" : branch;
  const hasTotals = report.columns.some((c) => c.total);
  const totals: Record<string, number> = {};
  report.columns.forEach((c) => { if (c.total) totals[c.key] = rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0); });

  return (
    <div className="p-6 bg-white text-black min-h-screen print:p-0">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 14mm; }
          .no-print { display: none !important; }
          body { background: white; }
        }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        thead { background: #1f2937; color: #fff; }
      `}</style>
      <div className="mb-3">
        <div className="text-lg font-bold">{brandName}</div>
        <div className="text-base">{report.title}</div>
        <div className="text-xs text-slate-600">Periode: {periodLabel} · Cabang: {branchLabel} · Dicetak: {formatDateTimeID(new Date())}</div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <table>
          <thead>
            <tr>{report.columns.map((c) => <th key={c.key} style={{ textAlign: c.align || (c.format === "currency" || c.format === "number" ? "right" : "left") }}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {report.columns.map((c) => <td key={c.key} style={{ textAlign: c.align || (c.format === "currency" || c.format === "number" ? "right" : "left") }}>{formatCell(r[c.key], c.format)}</td>)}
              </tr>
            ))}
            {hasTotals && rows.length > 0 && (
              <tr style={{ fontWeight: 700, background: "#f1f5f9" }}>
                {report.columns.map((c, i) => <td key={c.key} style={{ textAlign: c.align || (c.format === "currency" || c.format === "number" ? "right" : "left") }}>{i === 0 ? "TOTAL" : c.total ? formatCell(totals[c.key], c.format) : ""}</td>)}
              </tr>
            )}
          </tbody>
        </table>
      )}
      <button className="no-print mt-4 px-3 py-1 border rounded text-sm" onClick={() => window.print()}>Cetak</button>
    </div>
  );
}