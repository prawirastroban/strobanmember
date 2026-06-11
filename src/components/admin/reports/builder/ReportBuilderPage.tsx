import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, FileSpreadsheet, FileDown, FileText, Save, Plus, Trash2, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScopedBranches } from "@/hooks/useBranches";
import { useReportTemplates } from "@/hooks/useReportTemplates";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_TIMELINE, getDateRange, type TimelineValue, TIMELINE_PRESETS } from "@/utils/timelineFilter";
import { DATA_SOURCES, getDataSource, BUILDER_ROW_LIMIT, type DataSource, type DSField } from "./dataSources";
import { evaluateExpression, validateExpression } from "./calcParser";
import ReportTable from "../ReportTable";
import TemplateSaveDialog from "../templates/TemplateSaveDialog";
import type { ReportColumn } from "../types";
import { exportToExcel } from "../exporters/exportToExcel";
import { exportToCsv } from "../exporters/exportToCsv";
import { exportToPdf } from "../exporters/exportToPdf";
import { formatDateID } from "@/lib/reportFormat";

type Agg = "sum" | "avg" | "count" | "min" | "max";
interface Measure { id: string; field: string; agg: Agg; label?: string; }
interface CalcField { id: string; name: string; expr: string; }

interface BuilderConfig {
  dataSourceId: string;
  rows: string[];
  measures: Measure[];
  calcFields: CalcField[];
  filters: { field: string; op: "eq" | "neq" | "gt" | "lt"; value: string }[];
  timeline: TimelineValue;
  branch: string;
}

const defaultConfig = (): BuilderConfig => ({
  dataSourceId: "bookings",
  rows: ["branch"],
  measures: [{ id: crypto.randomUUID(), field: "service_price", agg: "sum", label: "Total Revenue" }],
  calcFields: [],
  filters: [],
  timeline: DEFAULT_TIMELINE,
  branch: "all",
});

export default function ReportBuilderPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  const { brandName } = useBranding();
  const { user } = useAuth();
  const { templates } = useReportTemplates("builder");

  const [config, setConfig] = useState<BuilderConfig>(defaultConfig());
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<ReportColumn[]>([]);
  const [running, setRunning] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // Load template from ?template=id
  useEffect(() => {
    const tid = sp.get("template");
    if (!tid) return;
    const t = templates.find((x) => x.id === tid);
    if (t?.config) setConfig({ ...defaultConfig(), ...t.config });
  }, [sp, templates]);

  // Force branch lock for admin_cabang
  useEffect(() => {
    if (isLocked && lockedBranch && config.branch !== lockedBranch) {
      setConfig((c) => ({ ...c, branch: lockedBranch }));
    }
  }, [isLocked, lockedBranch, config.branch]);

  const ds = useMemo(() => getDataSource(config.dataSourceId) as DataSource, [config.dataSourceId]);
  const range = useMemo(() => getDateRange(config.timeline), [config.timeline]);

  const measureFieldsAvailable = ds?.fields.filter((f) => f.measure) || [];
  const dimensionFields = ds?.fields.filter((f) => !f.measure) || [];

  const run = async () => {
    if (!ds) return;
    setRunning(true);
    try {
      // Select fields we need: row keys + measure fields + filter fields + date
      const need = new Set<string>([ds.dateField, ...config.rows, ...config.measures.map((m) => m.field), ...config.filters.map((f) => f.field)]);
      if (ds.hasBranch) need.add("branch");
      const selectStr = Array.from(need).join(",");
      let q: any = supabase.from(ds.table as any).select(selectStr).limit(BUILDER_ROW_LIMIT);
      // Date range
      const isDateOnly = ds.fields.find((f) => f.key === ds.dateField)?.kind === "date";
      const startVal = isDateOnly ? range.start : `${range.start}T00:00:00`;
      const endVal = isDateOnly ? range.end : `${range.end}T23:59:59`;
      q = q.gte(ds.dateField, startVal).lte(ds.dateField, endVal);
      // Branch
      if (ds.hasBranch && config.branch && config.branch !== "all") q = q.eq("branch", config.branch);
      // Filters
      for (const f of config.filters) {
        if (!f.field || f.value === "") continue;
        if (f.op === "eq") q = q.eq(f.field, f.value);
        else if (f.op === "neq") q = q.neq(f.field, f.value);
        else if (f.op === "gt") q = q.gt(f.field, f.value);
        else if (f.op === "lt") q = q.lt(f.field, f.value);
      }
      const { data, error } = await q;
      if (error) throw error;
      const raw: any[] = (data || []) as any[];

      // Aggregate
      const groupKey = (r: any) => config.rows.map((k) => String(r[k] ?? "-")).join("∥");
      const groups: Record<string, any[]> = {};
      for (const r of raw) {
        const k = groupKey(r);
        (groups[k] ||= []).push(r);
      }
      const aggregated = Object.entries(groups).map(([k, items]) => {
        const parts = k.split("∥");
        const out: Record<string, any> = {};
        config.rows.forEach((rk, i) => { out[rk] = parts[i]; });
        for (const m of config.measures) {
          const vals = items.map((it) => Number(it[m.field]) || 0);
          let v = 0;
          if (m.agg === "count") v = items.length;
          else if (m.agg === "sum") v = vals.reduce((s, n) => s + n, 0);
          else if (m.agg === "avg") v = vals.length ? vals.reduce((s, n) => s + n, 0) / vals.length : 0;
          else if (m.agg === "min") v = vals.length ? Math.min(...vals) : 0;
          else if (m.agg === "max") v = vals.length ? Math.max(...vals) : 0;
          out[m.id] = v;
        }
        // Calc fields
        for (const c of config.calcFields) {
          const scope: Record<string, number> = {};
          config.measures.forEach((mm) => { scope[mm.label || mm.id] = Number(out[mm.id]) || 0; scope[mm.id] = scope[mm.label || mm.id]; });
          try { out[c.id] = evaluateExpression(c.expr, scope); }
          catch { out[c.id] = null; }
        }
        return out;
      });

      // Build columns
      const cols: ReportColumn[] = [];
      for (const rk of config.rows) {
        const f = ds.fields.find((x) => x.key === rk);
        cols.push({ key: rk, label: f?.label || rk, format: f?.kind === "date" ? "date" : f?.kind === "datetime" ? "datetime" : "text" });
      }
      for (const m of config.measures) {
        const f = ds.fields.find((x) => x.key === m.field);
        const isMoney = /price|amount|total|revenue|commission|discount/.test(m.field);
        cols.push({
          key: m.id,
          label: m.label || `${m.agg.toUpperCase()}(${f?.label || m.field})`,
          format: m.agg === "count" ? "number" : isMoney ? "currency" : "number",
          align: "right",
          total: m.agg === "sum" || m.agg === "count",
        });
      }
      for (const c of config.calcFields) {
        cols.push({ key: c.id, label: c.name, format: "number", align: "right" });
      }

      setColumns(cols);
      setRows(aggregated);
      if (raw.length === BUILDER_ROW_LIMIT) toast.warning(`Hasil dibatasi ${BUILDER_ROW_LIMIT.toLocaleString("id-ID")} baris mentah.`);
      else toast.success(`Berhasil: ${aggregated.length.toLocaleString("id-ID")} baris hasil`);
    } catch (e: any) {
      toast.error("Gagal menjalankan", { description: e?.message });
      setRows([]); setColumns([]);
    } finally {
      setRunning(false);
    }
  };

  const periodLabel = `${formatDateID(range.start)} – ${formatDateID(range.end)}`;
  const branchLabel = config.branch === "all" ? "Semua Cabang" : config.branch;

  const onExportExcel = () => { if (!rows.length) return; exportToExcel("custom-report", "Custom Report", columns, rows, { period: periodLabel, branch: branchLabel }); };
  const onExportCsv = () => { if (!rows.length) return; exportToCsv("custom-report", columns, rows); };
  const onExportPdf = () => {
    if (!rows.length) return;
    exportToPdf("custom-report", columns, rows, { brandName, reportTitle: "Custom Report", period: periodLabel, branch: branchLabel, printedBy: user?.email || undefined });
  };

  const addMeasure = () => setConfig((c) => ({ ...c, measures: [...c.measures, { id: crypto.randomUUID(), field: measureFieldsAvailable[0]?.key || "", agg: "count" }] }));
  const addCalc = () => setConfig((c) => ({ ...c, calcFields: [...c.calcFields, { id: crypto.randomUUID(), name: "Field Baru", expr: "" }] }));
  const addFilter = () => setConfig((c) => ({ ...c, filters: [...c.filters, { field: dimensionFields[0]?.key || "", op: "eq", value: "" }] }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/reports")} className="-ml-2 mb-1">
            <ArrowLeft className="h-4 w-4 mr-1" /> Daftar Laporan
          </Button>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Custom Report Builder</h2>
          <p className="text-sm text-muted-foreground">Susun laporan: pilih data source, dimensi, agregasi, calculated field, dan filter.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={run} disabled={running}>{running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />} Jalankan</Button>
          <Button variant="outline" onClick={() => setSaveOpen(true)}><Save className="h-4 w-4 mr-1" /> Template</Button>
          <Button variant="outline" onClick={onExportExcel} disabled={!rows.length}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
          <Button variant="outline" onClick={onExportCsv} disabled={!rows.length}><FileText className="h-4 w-4 mr-1" /> CSV</Button>
          <Button variant="outline" onClick={onExportPdf} disabled={!rows.length}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {/* Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Data Source</Label>
              <Select value={config.dataSourceId} onValueChange={(v) => setConfig({ ...defaultConfig(), dataSourceId: v, branch: config.branch, timeline: config.timeline })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Periode</Label>
                <Select value={config.timeline.preset} onValueChange={(v) => setConfig((c) => ({ ...c, timeline: { preset: v as any } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMELINE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {ds?.hasBranch && (
                <div>
                  <Label>Cabang</Label>
                  <Select value={config.branch} onValueChange={(v) => setConfig((c) => ({ ...c, branch: v }))} disabled={isLocked}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {!isLocked && <SelectItem value="all">Semua Cabang</SelectItem>}
                      {branches.map((b) => <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {config.timeline.preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={config.timeline.startDate || ""} onChange={(e) => setConfig((c) => ({ ...c, timeline: { ...c.timeline, startDate: e.target.value } }))} />
                <Input type="date" value={config.timeline.endDate || ""} onChange={(e) => setConfig((c) => ({ ...c, timeline: { ...c.timeline, endDate: e.target.value } }))} />
              </div>
            )}
            <div>
              <Label>Rows (group by)</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {dimensionFields.map((f) => {
                  const active = config.rows.includes(f.key);
                  return (
                    <button key={f.key} type="button"
                      onClick={() => setConfig((c) => ({ ...c, rows: active ? c.rows.filter((x) => x !== f.key) : [...c.rows, f.key] }))}
                      className={`px-2 py-1 rounded-md text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary/50"}`}>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Values (measures)</Label>
              <Button size="sm" variant="ghost" onClick={addMeasure}><Plus className="h-3.5 w-3.5 mr-1" /> Tambah</Button>
            </div>
            <div className="space-y-2">
              {config.measures.map((m, idx) => (
                <div key={m.id} className="grid grid-cols-12 gap-1 items-center">
                  <Select value={m.agg} onValueChange={(v) => setConfig((c) => ({ ...c, measures: c.measures.map((x, i) => i === idx ? { ...x, agg: v as Agg } : x) }))}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">COUNT</SelectItem>
                      <SelectItem value="sum">SUM</SelectItem>
                      <SelectItem value="avg">AVG</SelectItem>
                      <SelectItem value="min">MIN</SelectItem>
                      <SelectItem value="max">MAX</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={m.field} onValueChange={(v) => setConfig((c) => ({ ...c, measures: c.measures.map((x, i) => i === idx ? { ...x, field: v } : x) }))}>
                    <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {measureFieldsAvailable.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                      {m.agg === "count" && <SelectItem value="*">* (semua)</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Input className="col-span-4" placeholder="Label" value={m.label || ""} onChange={(e) => setConfig((c) => ({ ...c, measures: c.measures.map((x, i) => i === idx ? { ...x, label: e.target.value } : x) }))} />
                  <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setConfig((c) => ({ ...c, measures: c.measures.filter((_, i) => i !== idx) }))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Calculated Fields</Label>
              <Button size="sm" variant="ghost" onClick={addCalc}><Plus className="h-3.5 w-3.5 mr-1" /> Tambah</Button>
            </div>
            <div className="space-y-2">
              {config.calcFields.map((c, idx) => {
                const avail = config.measures.map((m) => m.label || m.id);
                const valid = c.expr ? validateExpression(c.expr, avail) : { ok: true } as any;
                return (
                  <div key={c.id} className="grid grid-cols-12 gap-1 items-center">
                    <Input className="col-span-4" placeholder="Nama" value={c.name} onChange={(e) => setConfig((cf) => ({ ...cf, calcFields: cf.calcFields.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} />
                    <Input className="col-span-7" placeholder="Contoh: Revenue - Cost" value={c.expr} onChange={(e) => setConfig((cf) => ({ ...cf, calcFields: cf.calcFields.map((x, i) => i === idx ? { ...x, expr: e.target.value } : x) }))} />
                    <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setConfig((cf) => ({ ...cf, calcFields: cf.calcFields.filter((_, i) => i !== idx) }))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {c.expr && !valid.ok && <div className="col-span-12 text-xs text-destructive">{valid.error}</div>}
                  </div>
                );
              })}
              <div className="text-[10px] text-muted-foreground">Token diperbolehkan: nama measure, angka, + - * / dan kurung.</div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Filters</Label>
              <Button size="sm" variant="ghost" onClick={addFilter}><Plus className="h-3.5 w-3.5 mr-1" /> Tambah</Button>
            </div>
            <div className="space-y-2">
              {config.filters.map((f, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                  <Select value={f.field} onValueChange={(v) => setConfig((c) => ({ ...c, filters: c.filters.map((x, i) => i === idx ? { ...x, field: v } : x) }))}>
                    <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ds?.fields.map((fld) => <SelectItem key={fld.key} value={fld.key}>{fld.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={f.op} onValueChange={(v) => setConfig((c) => ({ ...c, filters: c.filters.map((x, i) => i === idx ? { ...x, op: v as any } : x) }))}>
                    <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">=</SelectItem>
                      <SelectItem value="neq">≠</SelectItem>
                      <SelectItem value="gt">&gt;</SelectItem>
                      <SelectItem value="lt">&lt;</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="col-span-4" placeholder="Nilai" value={f.value} onChange={(e) => setConfig((c) => ({ ...c, filters: c.filters.map((x, i) => i === idx ? { ...x, value: e.target.value } : x) }))} />
                  <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setConfig((c) => ({ ...c, filters: c.filters.filter((_, i) => i !== idx) }))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Badge variant="outline">{periodLabel}</Badge>
          {ds?.hasBranch && <Badge variant="outline">{branchLabel}</Badge>}
          {rows.length > 0 && <span>{rows.length.toLocaleString("id-ID")} baris hasil</span>}
        </div>
        {columns.length > 0 ? (
          <ReportTable columns={columns} rows={rows} />
        ) : (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Klik <b>Jalankan</b> untuk menjalankan query.</CardContent></Card>
        )}
      </div>

      <TemplateSaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        kind="builder"
        defaultName="Custom Report"
        config={config}
      />
    </div>
  );
}