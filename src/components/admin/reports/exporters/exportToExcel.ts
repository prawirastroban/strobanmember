import * as XLSX from "xlsx";
import type { ReportColumn } from "../types";
import { fileStamp } from "@/lib/reportFormat";

const formatCellValue = (val: any, fmt?: string): any => {
  if (val === null || val === undefined || val === "") return "";
  switch (fmt) {
    case "number":
    case "currency":
      return Number(val) || 0;
    case "date":
    case "datetime":
      return val;
    default:
      return val;
  }
};

export function exportToExcel(
  reportId: string,
  reportTitle: string,
  columns: ReportColumn[],
  rows: Record<string, any>[],
  meta?: { period?: string; branch?: string }
) {
  const wb = XLSX.utils.book_new();

  const header = columns.map((c) => c.label);
  const dataRows = rows.map((r) => columns.map((c) => formatCellValue(r[c.key], c.format)));

  // Total row
  const hasTotals = columns.some((c) => c.total);
  let totalRow: any[] | null = null;
  if (hasTotals) {
    totalRow = columns.map((c, i) => {
      if (i === 0) return "TOTAL";
      if (c.total) return rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
      return "";
    });
  }

  const aoa: any[][] = [
    [reportTitle],
    meta?.period ? [`Periode: ${meta.period}`] : [],
    meta?.branch ? [`Cabang: ${meta.branch}`] : [],
    [],
    header,
    ...dataRows,
  ];
  if (totalRow) aoa.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = columns.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.map((r) => String(r[c.key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  // Currency format on currency columns
  const headerRowIdx = 5; // 1-based, after 4 meta rows
  columns.forEach((c, ci) => {
    if (c.format === "currency") {
      for (let ri = 0; ri < rows.length; ri++) {
        const cellRef = XLSX.utils.encode_cell({ c: ci, r: headerRowIdx + ri });
        const cell = ws[cellRef];
        if (cell) cell.z = '"Rp "#,##0';
      }
    } else if (c.format === "number") {
      for (let ri = 0; ri < rows.length; ri++) {
        const cellRef = XLSX.utils.encode_cell({ c: ci, r: headerRowIdx + ri });
        const cell = ws[cellRef];
        if (cell) cell.z = "#,##0";
      }
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, "Laporan");
  XLSX.writeFile(wb, `${reportId}_${fileStamp()}.xlsx`);
}