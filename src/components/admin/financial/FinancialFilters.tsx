import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileDown, RefreshCw } from "lucide-react";
import { TIMELINE_PRESETS } from "@/utils/timelineFilter";
import { useBranches } from "@/hooks/useBranches";
import type { FinFilters } from "./useFinancialData";
import type { PromoRow } from "./useFinancialData";

const STATUSES = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface Props {
  filters: FinFilters;
  setFilters: (f: FinFilters) => void;
  promos: PromoRow[];
  onExportExcel: () => void;
  onExportPdf: () => void;
  onRefresh: () => void;
}

export default function FinancialFilters({ filters, setFilters, promos, onExportExcel, onExportPdf, onRefresh }: Props) {
  const { branches } = useBranches();
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50">
      <Select value={filters.timeline.preset} onValueChange={(v) => setFilters({ ...filters, timeline: { preset: v as any } })}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{TIMELINE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
      </Select>
      {filters.timeline.preset === "custom" && (
        <>
          <Input type="date" className="w-[140px] h-9" value={filters.timeline.startDate || ""} onChange={(e) => setFilters({ ...filters, timeline: { ...filters.timeline, startDate: e.target.value } })} />
          <Input type="date" className="w-[140px] h-9" value={filters.timeline.endDate || ""} onChange={(e) => setFilters({ ...filters, timeline: { ...filters.timeline, endDate: e.target.value } })} />
        </>
      )}
      <Select value={filters.branch || "_all"} onValueChange={(v) => setFilters({ ...filters, branch: v === "_all" ? "" : v })}>
        <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Cabang" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Semua Cabang</SelectItem>
          {branches.map((b) => <SelectItem key={b.id} value={b.slug}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input placeholder="Cari customer / HP" value={filters.customer} onChange={(e) => setFilters({ ...filters, customer: e.target.value })} className="w-[180px] h-9" />
      <Select value={filters.promoId || "_all"} onValueChange={(v) => setFilters({ ...filters, promoId: v === "_all" ? "" : v })}>
        <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Promo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Semua Promo</SelectItem>
          {promos.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.status || "_all"} onValueChange={(v) => setFilters({ ...filters, status: v === "_all" ? "" : v })}>
        <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value || "_all"} value={s.value || "_all"}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex-1" />
      <Button variant="outline" size="sm" className="h-9" onClick={onRefresh}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      <Button variant="outline" size="sm" className="h-9" onClick={onExportExcel}><FileDown className="h-4 w-4 mr-1" />Excel</Button>
      <Button variant="outline" size="sm" className="h-9" onClick={onExportPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
    </div>
  );
}
