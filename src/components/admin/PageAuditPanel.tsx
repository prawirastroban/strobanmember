import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  pageRegistry, getAuditCounts, type PageStatus,
} from "@/config/pageRegistry";
import {
  Activity, Archive, AlertTriangle, ArrowRightLeft, Files, Download,
} from "lucide-react";

const STATUS_STYLE: Record<PageStatus, string> = {
  ACTIVE:     "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  ARCHIVED:   "bg-slate-500/15 text-slate-600 border-slate-500/30",
  DEPRECATED: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  REDIRECTED: "bg-sky-500/15 text-sky-700 border-sky-500/30",
};

const KpiCard = ({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) => (
  <div className={`rounded-xl border p-3 ${tone}`}>
    <div className="flex items-center justify-between">
      <div className="text-xs font-medium opacity-80">{label}</div>
      <Icon className="h-4 w-4 opacity-70" />
    </div>
    <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
  </div>
);

const PageAuditPanel = () => {
  const counts = useMemo(() => getAuditCounts(), []);

  const exportCsv = () => {
    const header = ["path", "title", "status", "scope", "replacedBy", "notes"];
    const rows = pageRegistry.map((p) => [
      p.path, p.title, p.status, p.scope, p.replacedBy ?? "", p.notes ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Files className="h-5 w-5 text-primary" />
            Laporan Audit Halaman
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <KpiCard label="Total"      value={counts.total}             icon={Files}          tone="bg-muted/30 border-white/10" />
            <KpiCard label="Active"     value={counts.active}            icon={Activity}       tone="bg-emerald-500/10 border-emerald-500/30 text-emerald-700" />
            <KpiCard label="Archived"   value={counts.archived}          icon={Archive}        tone="bg-slate-500/10 border-slate-500/30 text-slate-700" />
            <KpiCard label="Deprecated" value={counts.deprecated}        icon={AlertTriangle}  tone="bg-amber-500/10 border-amber-500/30 text-amber-700" />
            <KpiCard label="Redirected" value={counts.redirected}        icon={ArrowRightLeft} tone="bg-sky-500/10 border-sky-500/30 text-sky-700" />
            <KpiCard label="Duplicate Found"    value={counts.duplicateFound}    icon={Files} tone="bg-rose-500/10 border-rose-500/30 text-rose-700" />
            <KpiCard label="Duplicate Resolved" value={counts.duplicateResolved} icon={Files} tone="bg-emerald-500/10 border-emerald-500/30 text-emerald-700" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Detail Halaman ({pageRegistry.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Replaced By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRegistry.map((p) => (
                <TableRow key={p.path}>
                  <TableCell className="font-mono text-xs">{p.path}</TableCell>
                  <TableCell className="text-sm">{p.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLE[p.status]}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.scope}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.replacedBy ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                    {p.notes ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PageAuditPanel;