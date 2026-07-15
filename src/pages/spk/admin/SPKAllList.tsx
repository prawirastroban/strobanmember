// SPK — All SPK list. Reads from SPKService/supabase; no aggregation logic.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

type Row = {
  id: string;
  spk_number: string;
  status: string;
  priority: string;
  created_at: string;
  customer_id: string | null;
  vehicle_id: string | null;
  data: any | null;
};

export default function SPKAllList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { isStaff, isAdmin, isAdminCabang } = useUserRole();
  const canManage = isStaff || isAdmin || isAdminCabang;
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, status, priority, created_at, customer_id, vehicle_id, data")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [reloadTick]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("spk_orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("Gagal menghapus SPK", { description: error.message });
      return;
    }
    toast.success(`SPK ${deleteTarget.spk_number} dihapus`);
    setDeleteTarget(null);
    setReloadTick((t) => t + 1);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (needle && !r.spk_number.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Semua SPK</h2>
          <p className="text-xs text-muted-foreground">Antrian, pembuatan, dan pengelolaan SPK dalam satu tempat.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("/spk")}
          >
            <ClipboardList className="h-4 w-4" />
            Buka Queue
          </Button>
          {canManage && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/spk/new")}
            >
              <Plus className="h-4 w-4" />
              Buat SPK Baru
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input placeholder="Cari nomor SPK…" value={q} onChange={(e) => setQ(e.target.value)} className="md:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-52"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_approval">Waiting Approval</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Tidak ada SPK.</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((r) => (
            <Card key={r.id} title={r.spk_number} onClick={() => navigate(`/spk/${r.id}`)} className="cursor-pointer hover:bg-muted/40 transition">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {(r.data?.booking_branch ?? "—")} · {(r.data?.vehicle_plate ?? "—")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tanggal service: {formatServiceDate(r.data?.booking_date, r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.priority === "high" && <Badge variant="destructive" className="text-[10px]">HIGH</Badge>}
                  <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                  {canManage && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/spk/${r.id}`);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(r);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus SPK ini?</AlertDialogTitle>
            <AlertDialogDescription>
              SPK <span className="font-semibold">{deleteTarget?.spk_number}</span> akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Menghapus…" : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}