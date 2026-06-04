import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Plus, Bug, Wrench, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReportFormDialog from "./ReportFormDialog";
import ReportCard from "./ReportCard";
import FilterBarV2, { type QuickChip, type ActiveChip } from "../filters/FilterBarV2";
import { DEFAULT_TIMELINE, type TimelineValue, getDateRange, isTimelineDefault } from "@/utils/timelineFilter";

export type InternalReport = {
  id: string;
  reporter_id: string | null;
  reporter_name: string | null;
  reporter_role: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  source: "internal" | "customer" | "guest";
  user_agent: string | null;
  category: "bug" | "revisi" | "masukan";
  title: string;
  description: string;
  image_url: string | null;
  page_url: string | null;
  status: "open" | "in_progress" | "fixed";
  fixed_at: string | null;
  fixed_by: string | null;
  fixed_note: string | null;
  created_at: string;
  updated_at: string;
};

const categoryMeta: Record<InternalReport["category"], { label: string; icon: any; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-500" },
  revisi: { label: "Revisi", icon: Wrench, color: "text-amber-500" },
  masukan: { label: "Masukan", icon: Lightbulb, color: "text-blue-500" },
};

const InternalReports = () => {
  const { user } = useAuth();
  const { isStaff, isCustomer, isLoading } = useUserRole();
  const { toast } = useToast();
  const [reports, setReports] = useState<InternalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<InternalReport | null>(null);

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("internal_reports" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Gagal memuat", description: error.message, variant: "destructive" });
    } else {
      setReports((data || []) as unknown as InternalReport[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase
      .channel("internal-reports-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "internal_reports" },
        () => fetchReports(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterSource !== "all" && r.source !== filterSource) return false;
      if (!isTimelineDefault(timeline)) {
        const { start, end } = getDateRange(timeline);
        const ts = new Date(r.created_at).getTime();
        if (start && ts < new Date(start + "T00:00:00").getTime()) return false;
        if (end && ts > new Date(end + "T23:59:59").getTime()) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.title} ${r.description} ${r.reporter_name || ""} ${r.reporter_email || ""} ${r.reporter_phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, filterCategory, filterStatus, filterSource, search, timeline]);

  if (isLoading) return null;
  if (isCustomer) {
    return <div className="p-6 text-sm text-muted-foreground">Halaman ini hanya untuk staff internal.</div>;
  }

  const resetAll = () => {
    setFilterCategory("all"); setFilterStatus("all"); setFilterSource("all");
    setSearch(""); setTimeline(DEFAULT_TIMELINE);
  };
  const quickChips: QuickChip[] = [
    { key: "bug", label: "🐛 Bug", active: filterCategory === "bug", onClick: () => setFilterCategory(filterCategory === "bug" ? "all" : "bug") },
    { key: "revisi", label: "🔧 Revisi", active: filterCategory === "revisi", onClick: () => setFilterCategory(filterCategory === "revisi" ? "all" : "revisi") },
    { key: "masukan", label: "💡 Masukan", active: filterCategory === "masukan", onClick: () => setFilterCategory(filterCategory === "masukan" ? "all" : "masukan") },
    { key: "open", label: "Open", active: filterStatus === "open", onClick: () => setFilterStatus(filterStatus === "open" ? "all" : "open") },
    { key: "ip", label: "In Progress", active: filterStatus === "in_progress", onClick: () => setFilterStatus(filterStatus === "in_progress" ? "all" : "in_progress") },
    { key: "fixed", label: "✅ Fixed", active: filterStatus === "fixed", onClick: () => setFilterStatus(filterStatus === "fixed" ? "all" : "fixed") },
  ];
  const activeChips: ActiveChip[] = [];
  if (filterCategory !== "all") activeChips.push({ key: "c", label: `Kategori: ${filterCategory}`, onRemove: () => setFilterCategory("all") });
  if (filterStatus !== "all") activeChips.push({ key: "s", label: `Status: ${filterStatus}`, onRemove: () => setFilterStatus("all") });
  if (filterSource !== "all") activeChips.push({ key: "src", label: `Sumber: ${filterSource}`, onRemove: () => setFilterSource("all") });
  if (!isTimelineDefault(timeline)) activeChips.push({ key: "tl", label: `Periode: ${timeline.preset}`, onRemove: () => setTimeline(DEFAULT_TIMELINE) });
  const isActiveFilter = activeChips.length > 0 || !!search;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bug & Masukan Internal</h2>
          <p className="text-xs text-muted-foreground">
            Laporkan bug, revisi, atau masukan. Hanya Owner yang bisa menandai sudah diperbaiki.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpenDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Report
        </Button>
      </div>

      <FilterBarV2
        search={{ placeholder: "Cari judul, deskripsi, pelapor...", value: search, onChange: setSearch }}
        quickChips={quickChips}
        activeChips={activeChips}
        resultCount={filtered.length}
        isActive={isActiveFilter}
        onReset={resetAll}
        advanced={{
          badge: activeChips.length,
          timeline: { value: timeline, onChange: setTimeline },
          dropdowns: [
            { key: "cat", label: "Kategori", value: filterCategory, onChange: setFilterCategory, options: [
              { label: "Semua Kategori", value: "all" },
              { label: "Bug", value: "bug" },
              { label: "Revisi", value: "revisi" },
              { label: "Masukan", value: "masukan" },
            ]},
            { key: "st", label: "Status", value: filterStatus, onChange: setFilterStatus, options: [
              { label: "Semua Status", value: "all" },
              { label: "Open", value: "open" },
              { label: "In Progress", value: "in_progress" },
              { label: "Sudah Diperbaiki", value: "fixed" },
            ]},
            { key: "src", label: "Sumber", value: filterSource, onChange: setFilterSource, options: [
              { label: "Semua Sumber", value: "all" },
              { label: "Internal Staff", value: "internal" },
              { label: "Customer Login", value: "customer" },
              { label: "Guest (Tanpa Login)", value: "guest" },
            ]},
          ],
        }}
      />

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground rounded-xl border border-dashed">
          Belum ada laporan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              currentUserId={user?.id || ""}
              isStaff={isStaff}
              categoryMeta={categoryMeta}
              onEdit={(rep) => { setEditing(rep); setOpenDialog(true); }}
              onChanged={fetchReports}
            />
          ))}
        </div>
      )}

      <ReportFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        editing={editing}
        onSaved={fetchReports}
      />
    </div>
  );
};

export default InternalReports;