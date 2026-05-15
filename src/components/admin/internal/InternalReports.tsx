import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Bug, Wrench, Lightbulb, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReportFormDialog from "./ReportFormDialog";
import ReportCard from "./ReportCard";

export type InternalReport = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_role: string | null;
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
  const [search, setSearch] = useState("");

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
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [reports, filterCategory, filterStatus, search]);

  if (isLoading) return null;
  if (isCustomer) {
    return <div className="p-6 text-sm text-muted-foreground">Halaman ini hanya untuk staff internal.</div>;
  }

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

      <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/60">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau catatan..."
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="revisi">Revisi</SelectItem>
            <SelectItem value="masukan">Masukan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="fixed">Sudah Diperbaiki</SelectItem>
          </SelectContent>
        </Select>
      </div>

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