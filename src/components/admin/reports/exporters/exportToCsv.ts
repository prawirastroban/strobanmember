import type { ReportColumn } from "../types";
import { fileStamp } from "@/lib/reportFormat";

const esc = (v: any): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const cellValue = (val: any, fmt?: string): any => {
  if (val === null || val === undefined || val === "") return "";
  if (fmt === "number" || fmt === "currency") return Number(val) || 0;
  return val;
};

export function exportToCsv(
  reportId: string,
  columns: ReportColumn[],
  rows: Record<string, any>[],
) {
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(cellValue(r[c.key], c.format))).join(","))
    .join("\n");

  const hasTotals = columns.some((c) => c.total);
  let totalLine = "";
  if (hasTotals) {
    totalLine =
      "\n" +
      columns
        .map((c, i) => {
          if (i === 0) return "TOTAL";
          if (c.total) return String(rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0));
          return "";
        })
        .map(esc)
        .join(",");
  }

  // Prepend BOM so Excel detects UTF-8.
  const csv = "\uFEFF" + header + "\n" + body + totalLine;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportId}_${fileStamp()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}