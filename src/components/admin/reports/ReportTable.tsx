import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah, formatNumber, formatDateID, formatDateTimeID } from "@/lib/reportFormat";
import type { ReportColumn } from "./types";

interface Props {
  columns: ReportColumn[];
  rows: Record<string, any>[];
}

const formatCell = (val: any, fmt?: string) => {
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

const PAGE_SIZE = 25;

export default function ReportTable({ columns, rows }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    columns.forEach((c) => {
      if (c.total) t[c.key] = rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
    });
    return t;
  }, [rows, columns]);
  const hasTotals = columns.some((c) => c.total);

  const onSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const alignClass = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40 sticky top-0">
            <TableRow>
              {columns.map((c) => {
                const isNum = c.format === "currency" || c.format === "number" || c.format === "percent";
                const align = c.align ?? (isNum ? "right" : "left");
                return (
                  <TableHead key={c.key} className={cn("whitespace-nowrap", alignClass(align))}>
                    <button
                      type="button"
                      onClick={() => onSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {c.label}
                      {sortKey === c.key && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  Tidak ada data untuk periode ini.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c) => {
                    const isNum = c.format === "currency" || c.format === "number" || c.format === "percent";
                    const align = c.align ?? (isNum ? "right" : "left");
                    const drillHref = c.drillTo ? c.drillTo(r) : null;
                    const content = formatCell(r[c.key], c.format);
                    return (
                      <TableCell key={c.key} className={cn("whitespace-nowrap", alignClass(align), isNum && "tabular-nums")}>
                        {drillHref ? (
                          <Link
                            to={drillHref}
                            className="text-primary hover:underline underline-offset-2"
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
            {hasTotals && pageRows.length > 0 && page === totalPages && (
              <TableRow className="bg-muted/30 font-semibold border-t-2">
                {columns.map((c, i) => {
                  const isNum = c.format === "currency" || c.format === "number" || c.format === "percent";
                  const align = c.align ?? (isNum ? "right" : "left");
                  return (
                    <TableCell key={c.key} className={cn("whitespace-nowrap", alignClass(align), isNum && "tabular-nums")}>
                      {i === 0 ? "TOTAL" : c.total ? formatCell(totals[c.key], c.format) : ""}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t text-sm text-muted-foreground">
          <span>{rows.length.toLocaleString("id-ID")} baris · Hal {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}