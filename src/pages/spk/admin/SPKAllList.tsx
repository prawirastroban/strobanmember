// SPK — Daftar terpadu (menggabungkan Queue lama). Live-bound ke spk_orders + relasi.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, CheckCircle2, ClipboardList, Clock,
  Loader2, Pencil, Trash2, Wrench, Eye, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterBarV2 from "@/components/admin/filters/FilterBarV2";
import { SPKViewDialog } from "@/components/spk/SPKViewDialog";
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
import {
  asSnapshot,
  getMechanicIdFromSnapshot,
  resolveSpkLoadNames,
  textValue,
} from "@/lib/spk/loadNames";

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
  mechanic_name?: string;
  customer_id?: string | null;
}

type Snapshot = Record<string, unknown>;

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

// Mirror of required keys from SPKCanvas SECTIONS. Keep in sync with
// src/pages/spk/SPKCanvas.tsx → SECTIONS[].requires so the tracker bar
// reflects real canvas completion.
const CANVAS_REQUIRED_KEYS: string[] = [
  // Customer
  "customer_name", "customer_phone",
  // Vehicle
  "vehicle_merk", "vehicle_tipe", "vehicle_plate", "vehicle_mileage_now",
  // Complaint
  "complaint_note",
  // Service Order
  "service_oil_brand", "service_oil_qty",
  // Safety Check
  "chk_engine_oil_cond", "chk_brake_fluid_cond",
  "chk_brake_pad_front_cond", "chk_brake_pad_rear_cond",
  "tyre_fl_cond", "tyre_fr_cond", "tyre_rl_cond", "tyre_rr_cond",
  // General Check Up
  "chk_spark_plug_cond", "chk_coolant_cond",
  "chk_air_filter_cond", "chk_ac_compressor_cond",
  // Estimasi
  "estimasi_items",
  // Finalisasi
  "mechanic_note",
  "final_check_inspection", "final_check_estimasi",
  "final_check_kebersihan", "final_check_ready",
];

const isFieldFilled = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "boolean") return v === true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return false;
};

function computeCanvasProgress(snap: Snapshot, ui: UiStatus): number {
  if (ui === "closed") return 100;
  if (ui === "cancelled") return 0;
  const total = CANVAS_REQUIRED_KEYS.length;
  if (total === 0) return PROGRESS_BY_STATUS[ui];
  const filled = CANVAS_REQUIRED_KEYS.reduce(
    (n, k) => n + (isFieldFilled(snap[k]) ? 1 : 0),
    0,
  );
  return Math.round((filled / total) * 100);
}

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
  spk, onClick, canManage, onEdit, onDelete, onView, onShare,
}: {
  spk: SpkCard;
  onClick: () => void;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onShare: () => void;
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
            <p className="min-w-0 break-words text-sm font-bold text-foreground [overflow-wrap:anywhere]">
              {spk.plate_number}
            </p>
            <p className="min-w-0 break-words text-xs text-foreground [overflow-wrap:anywhere]">
              {spk.customer_name} · {spk.vehicle_desc}
            </p>
            <p className="min-w-0 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
              {spk.branch_name} · {spk.service_date}
            </p>
            <p className="inline-flex min-w-0 flex-wrap items-center gap-1 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
              <Wrench className="h-3 w-3 shrink-0" />
              <span className={spk.mechanic_name ? "text-foreground/80" : "italic"}>
                {spk.mechanic_name ? spk.mechanic_name : "Belum ditugaskan"}
              </span>
            </p>
            {spk.service_summary && (
              <p className="min-w-0 break-words text-[11px] text-primary/90 [overflow-wrap:anywhere]" title={spk.service_summary}>
                {spk.service_summary}
              </p>
            )}
            <p className="hidden min-w-0 break-all font-mono text-[11px] text-muted-foreground sm:block">
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

        <div className="flex items-center justify-end gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3 text-xs"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            aria-label="Lihat SPK"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lihat</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3 text-xs"
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            aria-label="Bagikan PDF"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bagikan</span>
          </Button>
          {canManage && (
            <>
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
            </>
          )}
        </div>
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
  const [viewTarget, setViewTarget] = useState<SpkCard | null>(null);
  const [viewAutoShare, setViewAutoShare] = useState(false);

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
        .select("id, spk_number, status, priority, created_at, customer_id, vehicle_id, booking_id, branch_id, current_owner_role, current_owner_user_id, data")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);

      const list = (orders ?? []) as Array<{
        id: string; spk_number: string; status: string; priority: string;
        created_at: string;
        customer_id: string | null; vehicle_id: string | null; booking_id: string | null;
        branch_id: string | null; current_owner_role: string | null; current_owner_user_id: string | null;
        data: unknown;
      }>;

      const customerIds = Array.from(new Set(list.map((r) => r.customer_id).filter(Boolean) as string[]));
      const vehicleIds  = Array.from(new Set(list.map((r) => r.vehicle_id).filter(Boolean) as string[]));
      const bookingIds  = Array.from(new Set(list.map((r) => r.booking_id).filter(Boolean) as string[]));
      const branchIds = Array.from(new Set(list.map((r) => r.branch_id).filter(Boolean) as string[]));
      const mechanicIds = Array.from(new Set(list.flatMap((r) => {
        const snap = asSnapshot(r.data);
        const ids = [getMechanicIdFromSnapshot(snap)];
        if (r.current_owner_role === "mekanik" && r.current_owner_user_id) ids.push(r.current_owner_user_id);
        return ids.filter(Boolean);
      })));

      const [profilesRes, vehiclesRes, bookingsRes, loadNames] = await Promise.all([
        customerIds.length
          ? supabase.from("profiles").select("id, full_name, phone").in("id", customerIds)
          : Promise.resolve({ data: [] as any[] }),
        vehicleIds.length
          ? supabase.from("vehicles").select("id, brand, model, year, license_plate").in("id", vehicleIds)
          : Promise.resolve({ data: [] as any[] }),
        bookingIds.length
          ? supabase.from("bookings").select("id, customer_name, customer_phone, car_type, car_plate_number, service_name").in("id", bookingIds)
          : Promise.resolve({ data: [] as any[] }),
        resolveSpkLoadNames({ userIds: mechanicIds, branchIds }),
      ]);

      const profileMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const vehicleMap = new Map<string, any>((vehiclesRes.data ?? []).map((v: any) => [v.id, v]));
      const bookingMap = new Map<string, any>((bookingsRes.data ?? []).map((b: any) => [b.id, b]));

      const mapped: SpkCard[] = list.map((r) => {
        const prof    = r.customer_id ? profileMap.get(r.customer_id) : null;
        const veh     = r.vehicle_id  ? vehicleMap.get(r.vehicle_id)  : null;
        const booking = r.booking_id  ? bookingMap.get(r.booking_id)  : null;
        const snap    = asSnapshot(r.data);
        const mechanicSnapshotId = getMechanicIdFromSnapshot(snap);
        const mechanicName =
          textValue(snap.mechanic_name) ||
          (mechanicSnapshotId ? loadNames.mechanicNames[mechanicSnapshotId] : "") ||
          (r.current_owner_role === "mekanik" && r.current_owner_user_id
            ? loadNames.mechanicNames[r.current_owner_user_id]
            : "");

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
          branch_name:
            (r.branch_id ? loadNames.branchNames[r.branch_id] : "") ||
            textValue(snap.booking_branch) ||
            textValue(snap.branch_name) ||
            textValue(snap.branch) ||
            "—",
          service_date: fmtServiceDate(textValue(snap.booking_date), r.created_at),
          entry_time: fmtTime(r.created_at),
          progress_pct: computeCanvasProgress(snap, ui),
          priority: r.priority === "high" || r.priority === "urgent" ? "high" : "normal",
          phone:
            prof?.phone ||
            textValue(snap.customer_phone) ||
            booking?.customer_phone ||
            undefined,
          service_summary: buildServiceSummary(snap),
          mechanic_name: mechanicName || undefined,
          customer_id: r.customer_id,
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
      if (status !== "all" && r.ui_status !== status) return false;
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

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, in_progress: 0, closed: 0, cancelled: 0, draft: 0 };
    for (const r of rows) if (c[r.ui_status] !== undefined) c[r.ui_status]++;
    return c;
  }, [rows]);

  const STATUS_OPTIONS: Array<{ key: string; label: string }> = [
    { key: "all", label: "Semua" },
    { key: "in_progress", label: "Sedang Dikerjakan" },
    { key: "closed", label: "Selesai" },
    { key: "cancelled", label: "Dibatalkan" },
    { key: "draft", label: "Draft" },
  ];
  const isActive = q.trim().length > 0 || status !== "all";

  return (
    <div className="space-y-4">
      <FilterBarV2
        search={{
          placeholder: "Cari nomor SPK, pelanggan, plat, cabang, atau telepon…",
          value: q,
          onChange: setQ,
        }}
        quickChips={STATUS_OPTIONS.map((opt) => ({
          key: opt.key,
          label: opt.label,
          active: status === opt.key,
          onClick: () => setStatus(opt.key),
          count: statusCounts[opt.key] ?? 0,
        }))}
        activeChips={
          status !== "all"
            ? [{
                key: `status-${status}`,
                label: `Status: ${STATUS_OPTIONS.find((o) => o.key === status)?.label ?? status}`,
                onRemove: () => setStatus("all"),
              }]
            : []
        }
        resultCount={filtered.length}
        isActive={isActive}
        onReset={() => { setQ(""); setStatus("all"); }}
      />

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
              onView={() => { setViewAutoShare(false); setViewTarget(r); }}
              onShare={() => { setViewAutoShare(true); setViewTarget(r); }}
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

      <SPKViewDialog
        spkId={viewTarget?.id ?? null}
        spkNumber={viewTarget?.spk_number}
        open={!!viewTarget}
        onOpenChange={(o) => { if (!o) { setViewTarget(null); setViewAutoShare(false); } }}
        initialShareOpen={viewAutoShare}
        customerName={viewTarget?.customer_name}
        customerPhone={viewTarget?.phone}
        customerId={viewTarget?.customer_id}
        vehicleLabel={viewTarget?.vehicle_desc}
        plateNumber={viewTarget?.plate_number}
        branch={viewTarget?.branch_name}
        serviceDate={viewTarget?.service_date}
      />
    </div>
  );
}