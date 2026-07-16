// SPK — Daftar terpadu (menggabungkan Queue lama). Live-bound ke spk_orders + relasi.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, ClipboardList, Clock,
  Loader2, Pencil, Trash2,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { buildServiceSummary } from "@/lib/spk/spkDisplayMap";

// ─── Types & helpers ────────────────────────────────────────────────────────

type UiStatus = "in_progress" | "closed" | "cancelled" | "draft";

interface SpkCard {
  id: string;
  spk_number: string;
  db_status: string;
  ui_status: UiStatus;
  customer_name: string;
  vehicle_desc: string;
  plate_number: string;
  branch_name: string;
  service_date: string;
  entry_time: string;
  progress_pct: number;
  priority: "normal" | "high";
  phone?: string;
  service_summary?: string | null;
}

type Snapshot = Record<string, unknown>;

const asSnapshot = (v: unknown): Snapshot =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Snapshot) : {};

const textValue = (v: unknown): string => {
  if (typeof v === "string") return v.trim();
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const mapDbStatus = (s: string): UiStatus => {
  switch (s) {
    case "in_progress": return "in_progress";
    case "closed": return "closed";
    case "cancelled": return "cancelled";
    case "draft": return "draft";
    default: return "in_progress";
  }
};

const PROGRESS_BY_STATUS: Record<UiStatus, number> = {
  draft: 5,
  in_progress: 50,
  closed: 100,
  cancelled: 0,
};

const STATUS_META: Record<UiStatus, { label: string; badgeClass: string; icon: React.ElementType }> = {
  draft:            { label: "Draft",              badgeClass: "bg-muted text-muted-foreground border-white/10",        icon: ClipboardList },
  in_progress:      { label: "Sedang Dikerjakan",  badgeClass: "bg-primary/15 text-primary border-primary/30",          icon: Clock },
  closed:           { label: "Selesai",            badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  cancelled:        { label: "Dibatalkan",         badgeClass: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
};

const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return "--:--"; }
};

const fmtServiceDate = (booking?: string | null, fallback?: string) => {
  const raw = booking || fallback;
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Card ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UiStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={cn("whitespace-nowrap border text-[10px] font-semibold", meta.badgeClass)}>
      {meta.label}
    </Badge>
  );
}

function SpkCardItem({
  spk, onClick, canManage, onEdit, onDelete,
}: {
  spk: SpkCard;
  onClick: () => void;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const StatusIcon = STATUS_META[spk.ui_status].icon;
  return (
    <Card
      title={spk.spk_number}
      className="interactive-card cursor-pointer overflow-hidden transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-sm font-bold text-foreground">
              {spk.plate_number}
            </p>
            <p className="truncate text-xs text-foreground">
              {spk.customer_name} · {spk.vehicle_desc}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {spk.branch_name} · {spk.service_date}
            </p>
            {spk.service_summary && (
              <p className="truncate text-[11px] text-primary/90" title={spk.service_summary}>
                {spk.service_summary}
              </p>
            )}
            <p className="hidden sm:block truncate text-[11px] text-muted-foreground font-mono">
              {spk.spk_number}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusBadge status={spk.ui_status} />
            {spk.priority === "high" && (
              <span
                className="inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive border border-destructive/30"
                aria-label="Prioritas tinggi"
              >
                <AlertTriangle className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-between gap-3 mt-3">
          <div className="flex-1 min-w-0">
            {spk.ui_status !== "closed" && spk.ui_status !== "cancelled" && (
              <div className="flex items-center gap-2">
                <Progress value={spk.progress_pct} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {spk.progress_pct}%
                </span>
              </div>
            )}
            {spk.ui_status === "closed" && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Selesai</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <StatusIcon className="h-3 w-3" />
            <span className="tabular-nums">{spk.entry_time}</span>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3 text-xs"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hapus</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SPKAllList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SpkCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { isStaff, isAdmin, isAdminCabang } = useUserRole();
  const canManage = isStaff || isAdmin || isAdminCabang;
  const [deleteTarget, setDeleteTarget] = useState<SpkCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Legacy deep-link /dashboard/spk/all?action=new → dedicated intake
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
      navigate("/spk/new");
    }
  }, [searchParams, setSearchParams, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: orders } = await supabase
        .from("spk_orders")
        .select("id, spk_number, status, priority, created_at, customer_id, vehicle_id, booking_id, data")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);

      const list = (orders ?? []) as Array<{
        id: string; spk_number: string; status: string; priority: string;
        created_at: string;
        customer_id: string | null; vehicle_id: string | null; booking_id: string | null;
        data: unknown;
      }>;

      const customerIds = Array.from(new Set(list.map((r) => r.customer_id).filter(Boolean) as string[]));
      const vehicleIds  = Array.from(new Set(list.map((r) => r.vehicle_id).filter(Boolean) as string[]));
      const bookingIds  = Array.from(new Set(list.map((r) => r.booking_id).filter(Boolean) as string[]));

      const [profilesRes, vehiclesRes, bookingsRes] = await Promise.all([
        customerIds.length
          ? supabase.from("profiles").select("id, full_name, phone").in("id", customerIds)
          : Promise.resolve({ data: [] as any[] }),
        vehicleIds.length
          ? supabase.from("vehicles").select("id, brand, model, year, license_plate").in("id", vehicleIds)
          : Promise.resolve({ data: [] as any[] }),
        bookingIds.length
          ? supabase.from("bookings").select("id, customer_name, customer_phone, car_type, car_plate_number, service_name").in("id", bookingIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const vehicleMap = new Map<string, any>((vehiclesRes.data ?? []).map((v: any) => [v.id, v]));
      const bookingMap = new Map<string, any>((bookingsRes.data ?? []).map((b: any) => [b.id, b]));

      const mapped: SpkCard[] = list.map((r) => {
        const prof    = r.customer_id ? profileMap.get(r.customer_id) : null;
        const veh     = r.vehicle_id  ? vehicleMap.get(r.vehicle_id)  : null;
        const booking = r.booking_id  ? bookingMap.get(r.booking_id)  : null;
        const snap    = asSnapshot(r.data);

        const vehicleDesc = veh
          ? [veh.brand, veh.model, veh.year].filter(Boolean).join(" ")
          : [snap.vehicle_merk, snap.vehicle_tipe, snap.vehicle_tahun].map(textValue).filter(Boolean).join(" ")
            || booking?.car_type
            || "Kendaraan —";

        const ui = mapDbStatus(r.status);

        return {
          id: r.id,
          spk_number: r.spk_number,
          db_status: r.status,
          ui_status: ui,
          customer_name:
            prof?.full_name?.trim() ||
            textValue(snap.customer_name) ||
            booking?.customer_name ||
            "Pelanggan —",
          vehicle_desc: vehicleDesc || "Kendaraan —",
          plate_number:
            veh?.license_plate ||
            textValue(snap.vehicle_plate) ||
            booking?.car_plate_number ||
            "—",
          branch_name: textValue(snap.booking_branch) || "—",
          service_date: fmtServiceDate(textValue(snap.booking_date), r.created_at),
          entry_time: fmtTime(r.created_at),
          progress_pct: PROGRESS_BY_STATUS[ui],
          priority: r.priority === "high" || r.priority === "urgent" ? "high" : "normal",
          phone:
            prof?.phone ||
            textValue(snap.customer_phone) ||
            booking?.customer_phone ||
            undefined,
          service_summary: buildServiceSummary(snap),
        };
      });

      if (!cancelled) {
        setRows(mapped);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadTick]);

  // Realtime + focus refresh
  useEffect(() => {
    const channel = supabase
      .channel("spk-all-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "spk_orders" }, () => setReloadTick((t) => t + 1))
      .subscribe();
    const onFocus = () => setReloadTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

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
      if (status !== "all" && r.db_status !== status) return false;
      if (!needle) return true;
      return (
        r.spk_number.toLowerCase().includes(needle) ||
        r.customer_name.toLowerCase().includes(needle) ||
        r.plate_number.toLowerCase().includes(needle) ||
        r.branch_name.toLowerCase().includes(needle) ||
        (r.phone ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <Input
          placeholder="Cari nomor SPK, pelanggan, plat, cabang, atau telepon…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:max-w-md"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-52"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
            <SelectItem value="closed">Selesai</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Tidak ada SPK.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((r) => (
            <SpkCardItem
              key={r.id}
              spk={r}
              canManage={canManage}
              onClick={() => navigate(`/spk/${r.id}`)}
              onEdit={() => navigate(`/spk/${r.id}`)}
              onDelete={() => setDeleteTarget(r)}
            />
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
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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