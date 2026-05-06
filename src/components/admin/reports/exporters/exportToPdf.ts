import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportColumn } from "../types";
import {
  fileStamp,
  formatRupiah,
  formatNumber,
  formatDateID,
  formatDateTimeID,
} from "@/lib/reportFormat";

const formatCell = (val: any, fmt?: string): string => {
  if (val === null || val === undefined || val === "") return "";
  switch (fmt) {
    case "currency":
      return formatRupiah(Number(val) || 0);
    case "number":
      return formatNumber(Number(val) || 0);
    case "date":
      return formatDateID(val);
    case "datetime":
      return formatDateTimeID(val);
    case "percent":
      return `${Number(val).toFixed(1)}%`;
    default:
      return String(val);
  }
};

export interface PdfMeta {
  brandName: string;
  reportTitle: string;
  period?: string;
  branch?: string;
  printedBy?: string;
}

export function exportToPdf(
  reportId: string,
  columns: ReportColumn[],
  rows: Record<string, any>[],
  meta: PdfMeta
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(meta.brandName, 40, 40);
  doc.setFontSize(12);
  doc.text(meta.reportTitle, 40, 58);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const metaLines: string[] = [];
  if (meta.period) metaLines.push(`Periode: ${meta.period}`);
  if (meta.branch) metaLines.push(`Cabang: ${meta.branch}`);
  metaLines.push(`Dicetak: ${formatDateTimeID(new Date())}`);
  if (meta.printedBy) metaLines.push(`Oleh: ${meta.printedBy}`);
  doc.text(metaLines.join("   ·   "), 40, 74);

  // Total row
  const hasTotals = columns.some((c) => c.total);
  const tableBody = rows.map((r) => columns.map((c) => formatCell(r[c.key], c.format)));
  if (hasTotals) {
    const totalRow = columns.map((c, i) => {
      if (i === 0) return "TOTAL";
      if (c.total) {
        const sum = rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
        return formatCell(sum, c.format);
      }
      return "";
    });
    tableBody.push(totalRow);
  }

  autoTable(doc, {
    startY: 90,
    head: [columns.map((c) => c.label)],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillBy: [40, 40, 40], textColor: 255, fontStyle: "bold" } as any,
    columnStyles: columns.reduce((acc, c, i) => {
      acc[i] = { halign: c.align ?? (c.format === "currency" || c.format === "number" || c.format === "percent" ? "right" : "left") };
      return acc;
    }, {} as Record<number, any>),
    didDrawCell: (data) => {
      if (hasTotals && data.section === "body" && data.row.index === tableBody.length - 1) {
        doc.setFont("helvetica", "bold");
      }
    },
    didDrawPage: () => {
      const str = `Hal. ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.text(str, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
    },
  });

  doc.save(`${reportId}_${fileStamp()}.pdf`);
}