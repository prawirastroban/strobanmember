import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle, MessageSquareWarning, Wrench, Lightbulb, Search, MoreVertical,
  CheckCircle2, ArrowUpRight, ExternalLink, ImageIcon, Loader2, RefreshCw, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useScopedBranches } from "@/hooks/useBranches";
import { useFeedbackFeed } from "@/hooks/useFeedbackFeed";
import { PRIORITY_META, UnifiedItem, Priority, FeedbackTab } from "@/lib/feedbackPriority";

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
  const [detail, setDetail] = useState<UnifiedItem | null>(null);

  const visible = useMemo(() => {
    return items.filter((i) => {
      if (tab === "urgent") {
        if (i.priority !== "kritis" && i.priority !== "tinggi") return false;
        if (i.status === "resolved" || i.status === "fixed") return false;
      } else if (i.tab !== tab) return false;
      if (fPriority !== "all" && i.priority !== fPriority) return false;
      if (fStatus !== "all" && i.status !== fStatus) return false;
      if (fSource !== "all" && i.source !== fSource) return false;
      if (fBranch !== "all" && i.branch && i.branch.toLowerCase() !== fBranch.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${i.title} ${i.customerName || ""} ${i.description || ""} ${i.branch || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, tab, fPriority, fStatus, fSource, fBranch, search]);

  const counts = useMemo(() => {
    const c: Record<FeedbackTab, number> = { urgent: 0, customer: 0, operasional: 0, saran: 0 };
    items.forEach((i) => {
      if (i.status === "resolved" || i.status === "fixed" || i.status === "completed") return;
      if (i.priority === "kritis" || i.priority === "tinggi") c.urgent++;
      c[i.tab]++;
    });
    return c;
  }, [items]);

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

  const goBooking = (item: UnifiedItem) => item.bookingId && navigate(`/dashboard/bookings?id=${item.bookingId}`);
  const goPayment = (item: UnifiedItem) => navigate(`/dashboard/payments`);
  const goCustomer = (item: UnifiedItem) => item.userId && navigate(`/dashboard/customers/${item.userId}`);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#ff2b2b]" /> Pusat Kontrol Operasional
          </h2>
          <p className="text-xs text-muted-foreground">Monitoring real-time keluhan, error, dan evaluasi operasional.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
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

        {/* Filters */}
        <div className="mt-3 flex flex-col lg:flex-row gap-2 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/60">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, customer, cabang…" className="pl-9" />
          </div>
          <div className="grid grid-cols-2 lg:flex gap-2">
            <Select value={fPriority} onValueChange={setFPriority}>
              <SelectTrigger className="lg:w-[140px]"><SelectValue placeholder="Prioritas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Prioritas</SelectItem>
                <SelectItem value="kritis">Kritis</SelectItem>
                <SelectItem value="tinggi">Tinggi</SelectItem>
                <SelectItem value="sedang">Sedang</SelectItem>
                <SelectItem value="rendah">Rendah</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="lg:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="new">Baru</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">Diproses</SelectItem>
                <SelectItem value="resolved">Selesai</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fSource} onValueChange={setFSource}>
              <SelectTrigger className="lg:w-[160px]"><SelectValue placeholder="Sumber" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sumber</SelectItem>
                <SelectItem value="complaint">Customer</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="payment">Sistem · Pembayaran</SelectItem>
                <SelectItem value="booking">Sistem · Booking</SelectItem>
                <SelectItem value="review">Rating</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fBranch} onValueChange={setFBranch} disabled={isLocked}>
              <SelectTrigger className="lg:w-[160px]"><SelectValue placeholder="Cabang" /></SelectTrigger>
              <SelectContent>
                {!isLocked && <SelectItem value="all">Semua Cabang</SelectItem>}
                {branches.map((b) => <SelectItem key={b.id} value={b.slug}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : visible.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/70" />
                Tidak ada laporan untuk filter ini. ✨
              </CardContent></Card>
            ) : (
              visible.map((item) => (
                <ReportRow key={item.id}
                  item={item}
                  onOpen={() => setDetail(item)}
                  onResolve={() => markResolved(item)}
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
                  <Button size="sm" onClick={() => { markResolved(detail); setDetail(null); }}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tandai Selesai</Button>
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

const ReportRow = ({ item, onOpen, onResolve, onBooking, onPayment, onCustomer }: {
  item: UnifiedItem;
  onOpen: () => void; onResolve: () => void;
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
              <DropdownMenuItem onClick={onResolve}><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Tandai Selesai</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackControlCenter;