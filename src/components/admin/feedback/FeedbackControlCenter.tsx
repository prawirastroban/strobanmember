import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle, MessageSquareWarning, Wrench, Lightbulb, MoreVertical,
  CheckCircle2, ArrowUpRight, ExternalLink, ImageIcon, Loader2, RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useScopedBranches } from "@/hooks/useBranches";
import { useFeedbackFeed } from "@/hooks/useFeedbackFeed";
import { PRIORITY_META, UnifiedItem, Priority, FeedbackTab } from "@/lib/feedbackPriority";
import FilterBarV2, { type QuickChip, type ActiveChip } from "../filters/FilterBarV2";
import { DEFAULT_TIMELINE, type TimelineValue, getDateRange, isTimelineDefault } from "@/utils/timelineFilter";

const TABS: { value: FeedbackTab; label: string; icon: any }[] = [
  { value: "urgent", label: "Masalah Mendesak", icon: AlertTriangle },
  { value: "customer", label: "Feedback Customer", icon: MessageSquareWarning },
  { value: "operasional", label: "Kendala Operasional", icon: Wrench },
  { value: "saran", label: "Saran & Pengembangan", icon: Lightbulb },
];

const SOURCE_LABEL: Record<string, string> = {
  complaint: "Customer",
  internal: "Internal",
  payment: "Sistem · Pembayaran",
  booking: "Sistem · Booking",
  review: "Rating",
  auto: "Auto-detect",
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}j`;
  const d = Math.floor(h / 24); return `${d}h`;
}

const STATUS_GROUPS: Record<string, (s: string) => boolean> = {
  baru: (s) => ["new", "open", "pending"].includes(s),
  in_progress: (s) => s === "in_progress",
  selesai: (s) => ["resolved", "fixed", "completed"].includes(s),
  belum: (s) => !["resolved", "fixed", "completed"].includes(s),
};

const FeedbackControlCenter = () => {
  const navigate = useNavigate();
  const { isStaff } = useUserRole();
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  const { items, loading, kpi, refresh } = useFeedbackFeed();
  const [tab, setTab] = useState<FeedbackTab>("urgent");
  const [search, setSearch] = useState("");
  const [fPriority, setFPriority] = useState("all");
  const [fBranch, setFBranch] = useState<string>(isLocked && lockedBranch ? lockedBranch : "all");
  const [fStatus, setFStatus] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [detail, setDetail] = useState<UnifiedItem | null>(null);

  const branchSlugLower = (lockedBranch || "").toLowerCase();
  const branchAllowed = (i: UnifiedItem) => {
    if (!isLocked) return true;
    // Internal reports are global (no branch attribution) — keep for everyone.
    if (i.source === "internal") return true;
    if (!i.branch) return false; // hide untagged items from scoped admin
    return i.branch.toLowerCase() === branchSlugLower;
  };

  const visible = useMemo(() => {
    return items.filter((i) => {
      if (!branchAllowed(i)) return false;
      if (tab === "urgent") {
        if (i.priority !== "kritis" && i.priority !== "tinggi") return false;
        if (i.status === "resolved" || i.status === "fixed") return false;
      } else if (i.tab !== tab) return false;
      if (fPriority !== "all" && i.priority !== fPriority) return false;
      if (fStatus !== "all") {
        const fn = STATUS_GROUPS[fStatus];
        if (fn && !fn(i.status)) return false;
      }
      if (fSource !== "all" && i.source !== fSource) return false;
      if (fBranch !== "all" && i.branch && i.branch.toLowerCase() !== fBranch.toLowerCase()) return false;
      if (!isTimelineDefault(timeline)) {
        const { start, end } = getDateRange(timeline);
        const ts = new Date(i.createdAt).getTime();
        if (start && ts < new Date(start + "T00:00:00").getTime()) return false;
        if (end && ts > new Date(end + "T23:59:59").getTime()) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${i.title} ${i.customerName || ""} ${i.description || ""} ${i.branch || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, tab, fPriority, fStatus, fSource, fBranch, search, isLocked, branchSlugLower, timeline]);

  const counts = useMemo(() => {
    const c: Record<FeedbackTab, number> = { urgent: 0, customer: 0, operasional: 0, saran: 0 };
    items.forEach((i) => {
      if (!branchAllowed(i)) return;
      if (i.status === "resolved" || i.status === "fixed" || i.status === "completed") return;
      if (i.priority === "kritis" || i.priority === "tinggi") {
        c.urgent++;
        if (i.tab !== "urgent") c[i.tab]++;
      } else {
        c[i.tab]++;
      }
    });
    return c;
  }, [items, isLocked, branchSlugLower]);

  const filtersActive = search.trim() !== "" || fPriority !== "all" || fStatus !== "all" || fSource !== "all" || (!isLocked && fBranch !== "all") || !isTimelineDefault(timeline);

  const resetFilters = () => {
    setSearch(""); setFPriority("all"); setFStatus("all"); setFSource("all");
    if (!isLocked) setFBranch("all");
    setTimeline(DEFAULT_TIMELINE);
  };

  const exportCSV = () => {
    if (visible.length === 0) { toast.info("Tidak ada data untuk diekspor."); return; }
    const rows = [
      ["Waktu", "Prioritas", "Sumber", "Cabang", "Customer", "Judul", "Kategori", "Status"],
      ...visible.map((i) => [
        new Date(i.createdAt).toLocaleString("id-ID"),
        PRIORITY_META[i.priority].label,
        SOURCE_LABEL[i.source] || i.source,
        i.branch || "-",
        i.customerName || "-",
        (i.title || "").replace(/[\r\n]+/g, " "),
        i.category || "-",
        i.statusLabel || i.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${visible.length} laporan diekspor.`);
  };

  const markResolved = async (item: UnifiedItem) => {
    try {
      if (item.source === "complaint") {
        await (supabase as any).from("customer_complaints").update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", item.raw.id);
      } else if (item.source === "internal") {
        if (!isStaff) { toast.error("Hanya Owner yang dapat menandai selesai."); return; }
        await (supabase as any).from("internal_reports").update({ status: "fixed", fixed_at: new Date().toISOString() }).eq("id", item.raw.id);
      } else if (item.source === "review") {
        await (supabase as any).from("booking_reviews").update({ follow_up_status: "completed" }).eq("id", item.raw.id);
      } else {
        toast.info("Item sistem akan otomatis hilang setelah anomali terselesaikan.");
        return;
      }
      toast.success("Ditandai selesai.");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Gagal memperbarui status.");
    }
  };

  const canResolve = (item: UnifiedItem) => {
    if (item.source === "complaint" || item.source === "review") return true;
    if (item.source === "internal") return isStaff;
    return false; // payment & booking auto-resolve
  };

  const goBooking = (item: UnifiedItem) => item.bookingId && navigate(`/dashboard/bookings?id=${item.bookingId}`);
  const goPayment = (item: UnifiedItem) => {
    const qs = new URLSearchParams({ tab: "payments" });
    if (item.bookingId) qs.set("booking", item.bookingId);
    if (item.paymentId) qs.set("payment", item.paymentId);
    navigate(`/dashboard/history?${qs.toString()}`);
  };
  const goCustomer = (item: UnifiedItem) => item.userId && navigate(`/dashboard/customers/${item.userId}`);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#ff2b2b]" /> Pusat Kontrol Operasional
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitoring real-time keluhan, error, dan evaluasi operasional.
            {isLocked && lockedBranch && (
              <span className="ml-1 text-[#ff2b2b]">· Cabang: {branches.find((b) => b.slug === lockedBranch)?.name || lockedBranch}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5" disabled={visible.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Kritis" value={kpi.kritis} accent="from-red-500/30 to-red-500/5 border-red-500/40" glow />
        <KpiCard label="Tinggi" value={kpi.tinggi} accent="from-amber-500/30 to-amber-500/5 border-amber-500/40" />
        <KpiCard label="Belum Selesai" value={kpi.open} accent="from-blue-500/20 to-blue-500/5 border-blue-500/30" />
        <KpiCard label="Total Laporan" value={kpi.total} accent="from-muted/40 to-transparent border-border" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as FeedbackTab)}>
        <TabsList className="w-full overflow-x-auto flex justify-start sm:grid sm:grid-cols-4 h-auto gap-1 p-1 bg-card/60 backdrop-blur border border-border/60">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="flex-shrink-0 gap-2 data-[state=active]:bg-[#ff2b2b]/15 data-[state=active]:text-[#ff2b2b]">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden text-xs">{t.label.split(" ")[0]}</span>
                {counts[t.value] > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] bg-background/60">{counts[t.value]}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Filters (FilterBarV2) */}
        <div className="mt-3">
          {(() => {
            const quickChips: QuickChip[] = [
              { key: "kritis", label: "🔴 Kritis", active: fPriority === "kritis", onClick: () => setFPriority(fPriority === "kritis" ? "all" : "kritis") },
              { key: "tinggi", label: "🟠 Tinggi", active: fPriority === "tinggi", onClick: () => setFPriority(fPriority === "tinggi" ? "all" : "tinggi") },
              { key: "belum", label: "Belum Selesai", active: fStatus === "belum", onClick: () => setFStatus(fStatus === "belum" ? "all" : "belum") },
              { key: "today", label: "Hari Ini", active: timeline.preset === "today", onClick: () => setTimeline(timeline.preset === "today" ? DEFAULT_TIMELINE : { preset: "today" }) },
              { key: "week", label: "Minggu Ini", active: timeline.preset === "this_week", onClick: () => setTimeline(timeline.preset === "this_week" ? DEFAULT_TIMELINE : { preset: "this_week" }) },
              { key: "month", label: "Bulan Ini", active: timeline.preset === "this_month", onClick: () => setTimeline(timeline.preset === "this_month" ? DEFAULT_TIMELINE : { preset: "this_month" }) },
            ];
            const activeChips: ActiveChip[] = [];
            if (fPriority !== "all") activeChips.push({ key: "p", label: `Prioritas: ${fPriority}`, onRemove: () => setFPriority("all") });
            if (fStatus !== "all") activeChips.push({ key: "s", label: `Status: ${fStatus}`, onRemove: () => setFStatus("all") });
            if (fSource !== "all") activeChips.push({ key: "src", label: `Sumber: ${fSource}`, onRemove: () => setFSource("all") });
            if (!isLocked && fBranch !== "all") activeChips.push({ key: "b", label: `Cabang: ${branches.find((b) => b.slug === fBranch)?.name || fBranch}`, onRemove: () => setFBranch("all") });
            if (!isTimelineDefault(timeline)) activeChips.push({ key: "tl", label: `Periode: ${timeline.preset}`, onRemove: () => setTimeline(DEFAULT_TIMELINE) });
            return (
              <FilterBarV2
                search={{ placeholder: "Cari judul, customer, cabang…", value: search, onChange: setSearch }}
                quickChips={quickChips}
                activeChips={activeChips}
                resultCount={visible.length}
                isActive={filtersActive}
                onReset={resetFilters}
                advanced={{
                  badge: activeChips.length,
                  timeline: { value: timeline, onChange: setTimeline },
                  dropdowns: [
                    { key: "prio", label: "Prioritas", value: fPriority, onChange: setFPriority, options: [
                      { label: "Semua Prioritas", value: "all" },
                      { label: "Kritis", value: "kritis" },
                      { label: "Tinggi", value: "tinggi" },
                      { label: "Sedang", value: "sedang" },
                      { label: "Rendah", value: "rendah" },
                    ]},
                    { key: "st", label: "Status", value: fStatus, onChange: setFStatus, options: [
                      { label: "Semua Status", value: "all" },
                      { label: "Belum Selesai", value: "belum" },
                      { label: "Baru", value: "baru" },
                      { label: "Sedang Diproses", value: "in_progress" },
                      { label: "Selesai", value: "selesai" },
                    ]},
                    { key: "src", label: "Sumber", value: fSource, onChange: setFSource, options: [
                      { label: "Semua Sumber", value: "all" },
                      { label: "Customer", value: "complaint" },
                      { label: "Internal", value: "internal" },
                      { label: "Sistem · Pembayaran", value: "payment" },
                      { label: "Sistem · Booking", value: "booking" },
                      { label: "Rating", value: "review" },
                    ]},
                    { key: "branch", label: "Cabang", value: fBranch, onChange: setFBranch, disabled: isLocked, options: [
                      ...(!isLocked ? [{ label: "Semua Cabang", value: "all" }] : []),
                      ...branches.map((b) => ({ label: b.name, value: b.slug })),
                    ]},
                  ],
                }}
              />
            );
          })()}
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : visible.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/70" />
                {items.length === 0
                  ? "Belum ada laporan masuk. ✨"
                  : filtersActive
                    ? "Tidak ada laporan yang cocok dengan filter."
                    : "Tidak ada laporan di kategori ini."}
              </CardContent></Card>
            ) : (
              visible.map((item) => (
                <ReportRow key={item.id}
                  item={item}
                  onOpen={() => setDetail(item)}
                  onResolve={() => markResolved(item)}
                  canResolve={canResolve(item)}
                  onBooking={() => goBooking(item)}
                  onPayment={() => goPayment(item)}
                  onCustomer={() => goCustomer(item)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base pr-6 leading-snug">{detail.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={PRIORITY_META[detail.priority].className}>{PRIORITY_META[detail.priority].label}</Badge>
                  <Badge variant="outline">{SOURCE_LABEL[detail.source]}</Badge>
                  <Badge variant="outline">{detail.statusLabel}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {detail.customerName && <Info label="Customer" value={detail.customerName} />}
                  {detail.branch && <Info label="Cabang" value={detail.branch} />}
                  <Info label="Kategori" value={detail.category} />
                  <Info label="Waktu" value={new Date(detail.createdAt).toLocaleString("id-ID")} />
                </div>
                {detail.description && (
                  <div>
                    <div className="text-xs font-medium mb-1 text-muted-foreground">Deskripsi</div>
                    <p className="whitespace-pre-wrap bg-muted/30 rounded-md p-3 border text-sm">{detail.description}</p>
                  </div>
                )}
                {detail.imageUrl && (
                  <div>
                    <div className="text-xs font-medium mb-1 text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Lampiran</div>
                    <a href={detail.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img src={detail.imageUrl} alt="Lampiran" className="rounded-md border max-h-64 object-contain w-full" />
                    </a>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {detail.bookingId && (
                    <Button size="sm" variant="outline" onClick={() => goBooking(detail)}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Buka Booking</Button>
                  )}
                  {detail.paymentId && (
                    <Button size="sm" variant="outline" onClick={() => goPayment(detail)}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Buka Pembayaran</Button>
                  )}
                  {detail.userId && (
                    <Button size="sm" variant="outline" onClick={() => goCustomer(detail)}>Riwayat Customer</Button>
                  )}
                  {canResolve(detail) && (
                    <Button size="sm" onClick={() => { markResolved(detail); setDetail(null); }}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tandai Selesai
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-muted/20 p-2">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

const KpiCard = ({ label, value, accent, glow }: { label: string; value: number; accent: string; glow?: boolean }) => (
  <div className={`relative rounded-xl border bg-gradient-to-br ${accent} p-4 ${glow ? "shadow-[0_0_24px_-8px_rgba(255,43,43,0.6)]" : ""}`}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-3xl font-bold tabular-nums mt-1">{value}</div>
  </div>
);

const ReportRow = ({ item, onOpen, onResolve, canResolve, onBooking, onPayment, onCustomer }: {
  item: UnifiedItem;
  onOpen: () => void; onResolve: () => void; canResolve: boolean;
  onBooking: () => void; onPayment: () => void; onCustomer: () => void;
}) => {
  const meta = PRIORITY_META[item.priority];
  return (
    <Card className="hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: item.priority === "kritis" ? "#ff2b2b" : item.priority === "tinggi" ? "#f59e0b" : item.priority === "sedang" ? "#eab308" : "hsl(var(--border))" }}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge variant="outline" className={`${meta.className} text-[10px] px-1.5 py-0`}>{meta.label}</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{SOURCE_LABEL[item.source]}</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.statusLabel}</Badge>
              <span className="text-[10px] text-muted-foreground ml-auto sm:ml-2">{timeAgo(item.createdAt)}</span>
            </div>
            <button onClick={onOpen} className="text-left w-full">
              <div className="font-medium text-sm leading-snug line-clamp-2">{item.title}</div>
              {item.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>}
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {item.customerName && <span>👤 {item.customerName}</span>}
                {item.branch && <span>📍 {item.branch}</span>}
                <span className="opacity-70">{item.category}</span>
              </div>
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onOpen}><ArrowUpRight className="h-3.5 w-3.5 mr-2" /> Lihat Detail</DropdownMenuItem>
              {item.bookingId && <DropdownMenuItem onClick={onBooking}><ExternalLink className="h-3.5 w-3.5 mr-2" /> Buka Booking</DropdownMenuItem>}
              {item.paymentId && <DropdownMenuItem onClick={onPayment}><ExternalLink className="h-3.5 w-3.5 mr-2" /> Buka Pembayaran</DropdownMenuItem>}
              {item.userId && <DropdownMenuItem onClick={onCustomer}>Riwayat Customer</DropdownMenuItem>}
              {canResolve && (
                <DropdownMenuItem onClick={onResolve}><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Tandai Selesai</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackControlCenter;