import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { ReportColumn } from "./types";

export interface ReportCustomization {
  columns?: string[];           // ordered list of visible column keys
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
  groupKey?: string | null;
  filters?: { key: string; op: "contains" | "equals" | "gt" | "lt"; value: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  columns: ReportColumn[];
  value: ReportCustomization;
  onChange: (v: ReportCustomization) => void;
}

export default function ReportCustomizeSheet({ open, onOpenChange, columns, value, onChange }: Props) {
  const [draft, setDraft] = useState<ReportCustomization>(value);

  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const order = draft.columns ?? columns.map((c) => c.key);
  const visibleSet = new Set(order);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setDraft({ ...draft, columns: next });
  };

  const toggleCol = (key: string, on: boolean) => {
    const cur = new Set(order);
    if (on) cur.add(key); else cur.delete(key);
    // preserve original ordering for newly-added items
    const next = columns.map((c) => c.key).filter((k) => cur.has(k));
    setDraft({ ...draft, columns: next });
  };

  const addFilter = () => {
    setDraft({
      ...draft,
      filters: [...(draft.filters || []), { key: columns[0]?.key || "", op: "contains", value: "" }],
    });
  };

  const updateFilter = (i: number, patch: Partial<{ key: string; op: any; value: string }>) => {
    const next = [...(draft.filters || [])];
    next[i] = { ...next[i], ...patch } as any;
    setDraft({ ...draft, filters: next });
  };

  const removeFilter = (i: number) => {
    const next = [...(draft.filters || [])];
    next.splice(i, 1);
    setDraft({ ...draft, filters: next });
  };

  const apply = () => { onChange(draft); onOpenChange(false); };
  const reset = () => {
    const empty: ReportCustomization = {};
    setDraft(empty); onChange(empty); onOpenChange(false);
  };

  const labelOf = (key: string) => columns.find((c) => c.key === key)?.label || key;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Kustomisasi Laporan</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Columns */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">Kolom & Urutan</Label>
            <div className="rounded-md border divide-y">
              {order.map((key, i) => (
                <div key={key} className="flex items-center gap-2 p-2">
                  <Switch checked={visibleSet.has(key)} onCheckedChange={(v) => toggleCol(key, v)} />
                  <div className="flex-1 text-sm">{labelOf(key)}</div>
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === order.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {columns.filter((c) => !visibleSet.has(c.key)).map((c) => (
                <div key={c.key} className="flex items-center gap-2 p-2 opacity-60">
                  <Switch checked={false} onCheckedChange={(v) => toggleCol(c.key, v)} />
                  <div className="flex-1 text-sm">{c.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Sort */}
          <section className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Urutkan</Label>
              <Select
                value={draft.sortKey || "__none"}
                onValueChange={(v) => setDraft({ ...draft, sortKey: v === "__none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Tidak" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Tidak diurutkan</SelectItem>
                  {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Arah</Label>
              <Select
                value={draft.sortDir || "asc"}
                onValueChange={(v) => setDraft({ ...draft, sortDir: v as "asc" | "desc" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Naik</SelectItem>
                  <SelectItem value="desc">Turun</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Group */}
          <section className="space-y-1.5">
            <Label className="text-sm">Group by</Label>
            <Select
              value={draft.groupKey || "__none"}
              onValueChange={(v) => setDraft({ ...draft, groupKey: v === "__none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Tidak" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Tidak dikelompokkan</SelectItem>
                {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </section>

          {/* Filters */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Filter</Label>
              <Button size="sm" variant="outline" onClick={addFilter}><Plus className="h-3.5 w-3.5 mr-1" /> Tambah</Button>
            </div>
            <div className="space-y-2">
              {(draft.filters || []).map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                  <Select value={f.key} onValueChange={(v) => updateFilter(i, { key: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={f.op} onValueChange={(v) => updateFilter(i, { op: v as any })}>
                    <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">berisi</SelectItem>
                      <SelectItem value="equals">=</SelectItem>
                      <SelectItem value="gt">&gt;</SelectItem>
                      <SelectItem value="lt">&lt;</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={f.value} onChange={(e) => updateFilter(i, { value: e.target.value })} placeholder="nilai" />
                  <Button size="icon" variant="ghost" onClick={() => removeFilter(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {(draft.filters || []).length === 0 && (
                <div className="text-xs text-muted-foreground">Belum ada filter.</div>
              )}
            </div>
          </section>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={reset}>Reset</Button>
          <Button onClick={apply}>Terapkan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Helpers exported for use by ReportDetailPage ──
export function applyCustomization(
  baseColumns: ReportColumn[],
  rows: Record<string, any>[],
  cz: ReportCustomization,
): { columns: ReportColumn[]; rows: Record<string, any>[] } {
  // Columns
  let columns = baseColumns;
  if (cz.columns && cz.columns.length) {
    const map = new Map(baseColumns.map((c) => [c.key, c]));
    columns = cz.columns.map((k) => map.get(k)).filter(Boolean) as ReportColumn[];
  }

  // Filters
  let out = rows;
  for (const f of cz.filters || []) {
    if (!f.key || f.value === "") continue;
    const v = f.value;
    out = out.filter((r) => {
      const raw = r[f.key];
      if (raw === null || raw === undefined) return false;
      const sv = String(raw).toLowerCase();
      const tv = String(v).toLowerCase();
      switch (f.op) {
        case "contains": return sv.includes(tv);
        case "equals":   return sv === tv;
        case "gt":       return Number(raw) > Number(v);
        case "lt":       return Number(raw) < Number(v);
        default:         return true;
      }
    });
  }

  // Sort
  if (cz.sortKey) {
    const key = cz.sortKey;
    const dir = cz.sortDir === "desc" ? -1 : 1;
    out = [...out].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  // Group: insert subtotal rows. Mark grouped rows with __group flag for rendering hint.
  if (cz.groupKey) {
    const key = cz.groupKey;
    const numericKeys = columns.filter((c) => c.total).map((c) => c.key);
    const grouped: Record<string, any[]> = {};
    for (const r of out) {
      const k = String(r[key] ?? "-");
      (grouped[k] ||= []).push(r);
    }
    const flat: any[] = [];
    Object.entries(grouped).forEach(([gk, items]) => {
      flat.push(...items);
      const sub: any = { __subtotal: true, [columns[0]?.key || "_"]: `Subtotal: ${gk}` };
      for (const nk of numericKeys) sub[nk] = items.reduce((s, r) => s + (Number(r[nk]) || 0), 0);
      flat.push(sub);
    });
    out = flat;
  }

  return { columns, rows: out };
}