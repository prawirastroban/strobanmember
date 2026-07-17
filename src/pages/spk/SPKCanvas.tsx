// Phase 5.3 — Digital SPK Canvas: single-document assembly of all sections,
// matching the paper Stroban Service Report ordering. Design-only, no runtime.
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  Cloud,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { CanvasHeader } from "@/components/spk/canvas/CanvasHeader";
import { CustomerCard } from "@/components/spk/canvas/CustomerCard";
import { VehicleCard } from "@/components/spk/canvas/VehicleCard";
import { ComplaintCard } from "@/components/spk/canvas/ComplaintCard";
import { ServiceOrderCard } from "@/components/spk/canvas/ServiceOrderCard";
import { MechanicTabs } from "@/components/spk/canvas/v2/MechanicTabs";
import { FinalizationCard } from "@/components/spk/canvas/FinalizationCard";
import AIHealthCard from "@/components/spk/AIHealthCard";
import { SPKPrintLink } from "@/components/spk/SPKPrintLink";
import { useSPKRow } from "@/hooks/spk/useSPKRow";
import { FormRuntimeProvider, useFormRuntime } from "@/hooks/spk/FormRuntimeProvider";
import { SPKUXProvider, useSPKUX, type SectionMeta } from "@/components/spk/canvas/SPKUXContext";
import { useSPKAutosave, type AutosaveStatus } from "@/hooks/spk/useSPKAutosave";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useSPKWorkflow, type WorkflowAction } from "@/hooks/spk/useSPKWorkflow";
import type { SpkActor } from "@/services/spk/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

// Design-preview defaults. Used ONLY when there is no SPK id in the URL
// (i.e. someone is inspecting the Canvas outside a real record). Real
// SPKs never fall back to these values — they show loading placeholders
// until the DB row is fetched to avoid mixing dummy data with live data.
const CANVAS_META = {
  spkNumber: "SPK-2026-000123",
  branch: "Stroban Ciputat",
  date: "12 Feb 2026",
  status: "Draft",
};

const LOADING_META = {
  spkNumber: "Memuat…",
  branch: "Memuat…",
  date: "—",
  status: "Memuat…",
};

// Design-preview seeds. Kept empty to prevent placeholder identities (e.g.
// "Budi Santoso") from leaking into real SPKs. If you need mock values for
// design work, populate this object locally — never commit real-looking data.
const INITIAL_VALUES: Record<string, unknown> = {};

function asSnapshot(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function formatCanvasDate(value: unknown, fallback: string): string {
  const raw = textValue(value);
  if (!raw) return fallback;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatStatus(value: unknown, fallback: string): string {
  const raw = textValue(value);
  const labels: Record<string, string> = {
    draft: "Draft",
    open: "Dibuka",
    awaiting_customer_approval: "Menunggu Approval Customer",
    qc_pending: "Final Check Mekanik",
    in_progress: "Sedang Dikerjakan",
    pending_approval: "Menunggu Approval",
    approved: "Disetujui",
    closed: "Selesai",
    cancelled: "Dibatalkan",
  };
  return labels[raw] ?? fallback;
}

function buildRuntimeValues(spkRow: any | null, isRealSpk: boolean): Record<string, unknown> {
  if (isRealSpk) {
    // Real SPK: never mix in design-preview defaults. Return whatever the
    // database snapshot contains (empty until the row loads).
    return spkRow ? asSnapshot(spkRow.data) : {};
  }
  // Design preview only.
  if (!spkRow) return INITIAL_VALUES;
  return { ...INITIAL_VALUES, ...asSnapshot(spkRow.data) };
}

function buildCanvasMeta(spkRow: any | null, isRealSpk: boolean) {
  if (!spkRow) return isRealSpk ? LOADING_META : CANVAS_META;
  const fallback = isRealSpk ? LOADING_META : CANVAS_META;
  return {
    spkNumber: textValue(spkRow.spk_number) || fallback.spkNumber,
    branch: textValue(spkRow._branch_name) || fallback.branch,
    date: formatCanvasDate(spkRow.opened_at || spkRow.created_at, fallback.date),
    status: formatStatus(spkRow.status, fallback.status),
  };
}

const SECTIONS: SectionMeta[] = [
  { id: "sec-customer", label: "Customer", index: 1, role: "sa", requires: ["customer_name", "customer_phone"] },
  { id: "sec-vehicle", label: "Vehicle", index: 2, role: "sa", requires: ["vehicle_merk", "vehicle_tipe", "vehicle_plate", "vehicle_mileage_now"] },
  { id: "sec-complaint", label: "Complaint", index: 3, role: "sa", requires: ["complaint_note"] },
  { id: "sec-service-order", label: "Service Order", index: 4, role: "sa", requires: ["service_oil_brand", "service_oil_qty"] },
  {
    id: "sec-safety",
    label: "Safety Check",
    index: 5,
    role: "mechanic",
    requires: [
      "chk_engine_oil_cond",
      "chk_brake_fluid_cond",
      "chk_brake_pad_front_cond",
      "chk_brake_pad_rear_cond",
      "tyre_fl_cond",
      "tyre_fr_cond",
      "tyre_rl_cond",
      "tyre_rr_cond",
    ],
  },
  {
    id: "sec-general",
    label: "General Check Up",
    index: 6,
    role: "mechanic",
    requires: [
      "chk_spark_plug_cond",
      "chk_coolant_cond",
      "chk_air_filter_cond",
      "chk_ac_compressor_cond",
    ],
  },
  { id: "sec-estimasi", label: "Estimasi", index: 7, role: "mechanic", requires: ["estimasi_items"] },
  { id: "sec-finalization", label: "Finalisasi", index: 8, role: "mechanic", requires: ["mechanic_note", "signature_mekanik"] },
];

export default function SPKCanvas() {
  const { id } = useParams();
  const role = useEffectiveSpkRole();
  const { row: spkRow, setRow: setSpkRow } = useSPKRow(id ?? null);
  const initialValues = useMemo(() => buildRuntimeValues(spkRow, !!id), [spkRow, id]);
  const meta = useMemo(() => buildCanvasMeta(spkRow, !!id), [spkRow, id]);
  return (
    <FormRuntimeProvider
      templateCode="spk_service_report"
      role={role}
      initialValues={initialValues}
      initialValuesReady={!id || !!spkRow}
    >
      <SPKUXProvider spkId={id ?? CANVAS_META.spkNumber} sections={SECTIONS}>
        <SPKCanvasInner spkId={id ?? null} role={role} spkRow={spkRow} setSpkRow={setSpkRow} meta={meta} />
      </SPKUXProvider>
    </FormRuntimeProvider>
  );
}

/**
 * useEffectiveSpkRole — resolves the SPK actor role for the Runtime.
 * Runs at the page (wiring) layer, NOT inside canvas components — the canvas
 * itself never branches on role. Priority: URL `?role=` override → mapped
 * from app user role → fallback "reception".
 */
const VALID_ACTORS = new Set<SpkActor>([
  "reception",
  "mechanic",
  "qc",
  "cashier",
  "owner",
  "admin",
  "admin_cabang",
  "system",
]);
function useEffectiveSpkRole(): SpkActor {
  const [params] = useSearchParams();
  const { isStaff, isAdmin, isAdminCabang, isMekanik, isHeadMekanik, isCustomer } = useUserRole();
  const override = params.get("role");
  if (override && VALID_ACTORS.has(override as SpkActor)) {
    return override as SpkActor;
  }
  if (isStaff) return "owner";
  if (isAdmin) return "admin";
  if (isAdminCabang) return "admin_cabang";
  // Head Mekanik bertugas review final SPK → dipetakan sebagai mechanic
  // (memakai alias workflow yang sama; final check dilakukan lewat aktor mechanic).
  if (isHeadMekanik) return "mechanic";
  if (isMekanik) return "mechanic";
  if (isCustomer) return "system";
  return "system";
}

function SPKCanvasInner({
  spkId,
  role,
  spkRow,
  setSpkRow,
  meta,
}: {
  spkId: string | null;
  role: SpkActor;
  spkRow: any | null;
  setSpkRow: Dispatch<SetStateAction<any>>;
  meta: typeof CANVAS_META;
}) {
  const navigate = useNavigate();
  const runtime = useFormRuntime();
  const ux = useSPKUX();
  const { user } = useAuth();
  const workflow = useSPKWorkflow({ spkId, role, userId: user?.id ?? null });

  // Real autosave: persist runtime.values → spk_orders.data (merged, debounced).
  // Prevents data loss when the user navigates back and returns.
  const autosave = useSPKAutosave({
    spkId,
    role,
    values: runtime.values,
    onSaved: (nextData) =>
      setSpkRow((r: any) => (r ? { ...r, data: nextData } : r)),
  });

  // Auto-capture mechanic identity the FIRST time a mechanic account opens
  // this SPK. Persisted into spk_orders.data so FinishActionBar / PDF / Time
  // Summary all reflect the actual worker — not the closer.
  const didCaptureMechanicRef = useRef(false);
  useEffect(() => {
    if (didCaptureMechanicRef.current) return;
    if (role !== "mechanic") return;
    if (!spkId || !spkRow || !user?.id) return;
    const existing = (spkRow.data ?? {}) as Record<string, any>;
    if (existing.mechanic_user_id) {
      didCaptureMechanicRef.current = true;
      return;
    }
    didCaptureMechanicRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        const resolved =
          (profile?.full_name && String(profile.full_name).trim()) ||
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          user.email ||
          "Mekanik";
        const nowIso = new Date().toISOString();
        const nextData = {
          ...existing,
          mechanic_user_id: user.id,
          mechanic_name: resolved,
          mechanic_opened_at: existing.mechanic_opened_at ?? nowIso,
          time_start: existing.time_start ?? nowIso,
        };
        const { error } = await supabase
          .from("spk_orders")
          .update({ data: nextData })
          .eq("id", spkId);
        if (error) throw error;
        if (!cancelled) {
          setSpkRow((r: any) => (r ? { ...r, data: nextData } : r));
        }
      } catch {
        // Non-fatal: allow retry on next mount by resetting the guard.
        didCaptureMechanicRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, spkId, spkRow, user?.id, setSpkRow]);

  // Validate before performing the primary transition. Non-primary transitions
  // (e.g. Reject, Cancel) skip validation.
  const runAction = async (action: WorkflowAction) => {
    if (action.tone === "primary" || action.tone === "safe") {
      const outcome = runtime.validateAll();
      if (outcome.ok === false) {
        const first = outcome.issues[0];
        toast.error(
          `Belum lengkap · ${outcome.issues.length} isian`,
          { description: `${first.field_code}: ${first.message}` },
        );
        const el = document.querySelector(`[data-field="${first.field_code}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    const res = await workflow.runTransition(action.to_status);
    if (!res.ok) {
      toast.error("Transisi gagal", { description: res.error });
      return;
    }
    toast.success(`${action.label} · berhasil`);
  };

  // Fallback used when Runtime is idle (no real SPK id — design preview).
  const onFinishFallback = () => {
    const outcome = runtime.validateAll();
    if (outcome.ok === false) {
      const first = outcome.issues[0];
      toast.error(
        `Belum lengkap · ${outcome.issues.length} isian`,
        { description: `${first.field_code}: ${first.message}` },
      );
      const el = document.querySelector(`[data-field="${first.field_code}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    toast.success("Semua isian valid — siap disimpan (Phase 5.4B).");
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(-1)}
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {meta.spkNumber}
              </p>
              <SaveStatusChip autosave={autosave.enabled ? autosave.status : null} />
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {meta.branch}
              <span className="mx-1.5 text-muted-foreground/60">·</span>
              {meta.date}
              <span className="mx-1.5 text-muted-foreground/60">·</span>
              <span className="font-medium text-foreground">
                {ux.completedCount}/{ux.totalCount}
              </span>{" "}
              item selesai
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mx-auto max-w-2xl px-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full bg-emerald-500/80 transition-[width] duration-500"
              style={{
                width: `${(ux.completedCount / Math.max(ux.totalCount, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <CanvasHeader
          spkNumber={meta.spkNumber}
          branch={meta.branch}
          date={meta.date}
        />

        <CustomerCard />
        <VehicleCard />
        <ComplaintCard />
        <ServiceOrderCard />

        {/* Pengerjaan Mekanik — layout v2 (Safety / General / Estimasi) */}
        <MechanicTabs />

        {/* Sections 9–11 merged into a single always-open form */}
        <FinalizationCard />

        {spkId && (
          <div className="space-y-2">
            <AIHealthCard
              spk={spkRow ?? { id: spkId, ai_health_report: null, data: {} }}
              onUpdated={(report) => setSpkRow((r: any) => ({ ...(r ?? { id: spkId }), ai_health_report: report }))}
            />
            <div className="flex justify-end">
              <SPKPrintLink spkId={spkId} />
            </div>
          </div>
        )}

        {Object.keys(runtime.issues).length > 0 && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[12px] text-primary">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {Object.keys(runtime.issues).length} isian belum valid
            </span>
          </div>
        )}

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          Dokumen ini adalah Living SPK — setiap peran memperbarui bagian yang
          menjadi tanggung jawabnya. Struktur diselaraskan dengan Service Report Stroban.
        </p>
      </main>

      <FinishActionBar
        spkId={spkId}
        spkRow={spkRow}
        role={role}
        runtime={runtime}
        setSpkRow={setSpkRow}
        onNavigateBack={() => navigate(-1)}
      />
    </div>
  );
}

// Simplified bottom bar — one primary "Selesaikan SPK" action, no more
// approval/QC gating. Closes the SPK directly once required fields validate.
function FinishActionBar({
  spkId,
  spkRow,
  role,
  runtime,
  setSpkRow,
  onNavigateBack,
}: {
  spkId: string | null;
  spkRow: any;
  role: SpkActor;
  runtime: ReturnType<typeof useFormRuntime>;
  setSpkRow: Dispatch<SetStateAction<any>>;
  onNavigateBack: () => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const alreadyClosed = spkRow?.status === "closed" || spkRow?.status === "invoice_paid" || spkRow?.status === "invoice_issued";
  const issueCount = Object.keys(runtime.issues).length;

  const handleFinish = async () => {
    const outcome = runtime.validateAll();
    if (outcome.ok === false) {
      const first = outcome.issues[0];
      toast.error(`Belum lengkap · ${outcome.issues.length} isian`, {
        description: `${first.field_code}: ${first.message}`,
      });
      const el = document.querySelector(`[data-field="${first.field_code}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!spkId) {
      toast.success("Semua isian valid — siap disimpan.");
      return;
    }
    if (!window.confirm("Selesaikan SPK ini sekarang? Status akan berubah menjadi 'Selesai'.")) return;
    setBusy(true);
    try {
      const prevStatus = spkRow?.status ?? "in_progress";
      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const existing = (spkRow?.data ?? {}) as Record<string, any>;
      const startIso =
        (typeof existing.time_start === "string" && existing.time_start) ||
        spkRow?.in_progress_at ||
        spkRow?.opened_at ||
        spkRow?.created_at ||
        nowIso;
      const startDate = new Date(startIso);
      const durationMin = Math.max(
        0,
        Math.round((nowDate.getTime() - startDate.getTime()) / 60000),
      );
      const durationText = `${Math.floor(durationMin / 60)}j ${durationMin % 60}m`;
      const timeFmt = (d: Date) =>
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const mechanicName =
        (typeof existing.mechanic_name === "string" && existing.mechanic_name) ||
        (user?.user_metadata as any)?.full_name ||
        (user?.user_metadata as any)?.name ||
        user?.email ||
        role;
      const nextData = {
        ...existing,
        time_start: startIso,
        time_end: nowIso,
        time_duration: durationText,
        date_in: existing.date_in ?? (spkRow?.opened_at ?? spkRow?.created_at ?? nowIso),
        date_out: nowIso,
        time_in: existing.time_in ?? timeFmt(startDate),
        time_out: timeFmt(nowDate),
        mechanic_name: mechanicName,
        closed_at: nowIso,
        closed_by_role: role,
      };
      const { error } = await supabase
        .from("spk_orders")
        .update({ status: "closed", data: nextData })
        .eq("id", spkId);
      if (error) throw error;
      await supabase.from("spk_events").insert({
        spk_id: spkId,
        event_type: "status_changed",
        payload: {
          from: prevStatus,
          to: "closed",
          reason: "direct_finish",
          workflow_code: "spk_default",
        },
        actor_role: role,
      } as any);
      setSpkRow((r: any) => (r ? { ...r, status: "closed", data: nextData } : r));
      toast.success("SPK selesai");
    } catch (e: any) {
      toast.error("Gagal menyelesaikan SPK", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || alreadyClosed;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/60 backdrop-blur-xl shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.4)] supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <Button
          type="button"
          variant="ghost"
          onClick={onNavigateBack}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Kembali</span>
        </Button>
        <button
          type="button"
          onClick={handleFinish}
          disabled={disabled}
          className="relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="relative z-10 inline-flex items-center justify-center gap-2">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Memproses…
              </>
            ) : alreadyClosed ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> SPK Sudah Selesai
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Selesaikan SPK
                {issueCount > 0 && (
                  <span className="ml-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                    {issueCount} perlu dicek
                  </span>
                )}
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

// Staff/Admin escape: when workflow rules "lock" the SPK at qc_pending /
// awaiting_customer_approval / closed_pending, allow returning the SPK to
// in_progress so a mechanic can revise. Uses workflow.runTransition first,
// falls back to a direct spk_orders update + timeline event insert.

function StaffRevisionEscape({
  spkId,
  spkRow,
  role,
  setSpkRow,
}: {
  spkId: string | null;
  spkRow: any | null;
  role: SpkActor;
  setSpkRow: Dispatch<SetStateAction<any>>;
}) {
  const REVISABLE = new Set(["qc_pending", "awaiting_customer_approval", "closed_pending", "closed"]);
  const ALLOWED_ROLES = new Set<SpkActor>(["admin", "admin_cabang", "reception"]);
  const [busy, setBusy] = useState(false);
  if (!spkId || !spkRow) return null;
  if (!ALLOWED_ROLES.has(role)) return null;
  if (!REVISABLE.has(spkRow.status)) return null;

  const trigger = async () => {
    if (!window.confirm("Kembalikan SPK ini ke tahap 'Dikerjakan' agar bisa direvisi mekanik?")) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("spk_orders")
        .update({
          status: "in_progress",
          data: {
            ...(spkRow.data ?? {}),
            manual_revision_at: new Date().toISOString(),
            manual_revision_by: role,
          },
        })
        .eq("id", spkId);
      if (error) throw error;
      await supabase.from("spk_events").insert({
        spk_id: spkId,
        event_type: "status_changed",
        payload: {
          from: spkRow.status,
          to: "in_progress",
          reason: "manual_revision",
          workflow_code: "spk_default",
        },
        actor_role: role,
      } as any);
      setSpkRow((r: any) => (r ? { ...r, status: "in_progress" } : r));
      toast.success("SPK dikembalikan untuk revisi");
    } catch (e: any) {
      toast.error("Gagal mengirim ke revisi", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={busy}
      className="w-full rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] font-semibold text-amber-700 hover:bg-amber-500/20 disabled:opacity-60 dark:text-amber-300"
    >
      {busy ? "Memproses…" : "↩ Minta Revisi ke Mekanik (Override Workflow)"}
    </button>
  );
}

function WorkflowActionBar({
  workflow,
  onAction,
  onFallbackFinish,
}: {
  workflow: ReturnType<typeof useSPKWorkflow>;
  onAction: (a: WorkflowAction) => void;
  onFallbackFinish: () => void;
}) {
  // No real SPK id → Runtime idle. Fall back to the validate-only finish button
  // so the design preview keeps working. No hardcoded workflow logic here.
  if (!workflow.runtimeAvailable) {
    return (
      <>
        <Button variant="outline" className="h-12 flex-1 gap-1.5 px-2 text-sm">
          <Save className="h-4 w-4 shrink-0" />
          <span className="truncate">Simpan</span>
        </Button>
        <Button
          className="h-12 flex-[1.4] gap-1.5 bg-primary px-2 text-sm text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90"
          onClick={onFallbackFinish}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="truncate">Validasi</span>
        </Button>
      </>
    );
  }

  if (workflow.loading && workflow.actions.length === 0) {
    return (
      <Button variant="outline" disabled className="h-12 flex-1 gap-1.5 px-2 text-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span className="truncate">Memuat workflow…</span>
      </Button>
    );
  }

  if (workflow.actions.length === 0) {
    return (
      <div className="flex h-12 flex-1 items-center justify-center rounded-md border border-dashed border-border px-3 text-[12px] text-muted-foreground">
        Tidak ada aksi tersedia untuk status
        {workflow.status ? ` "${workflow.status}"` : ""} pada role Anda.
      </div>
    );
  }

  // Split: last action becomes the primary CTA, others compact secondary buttons.
  const actions = workflow.actions;
  const primary = actions[actions.length - 1];
  const secondaries = actions.slice(0, -1);
  return (
    <>
      {secondaries.map((a) => (
        <Button
          key={a.to_status}
          variant={a.tone === "danger" ? "destructive" : "outline"}
          className="h-12 flex-1 gap-1.5 px-2 text-sm"
          onClick={() => onAction(a)}
          disabled={workflow.loading}
        >
          <span className="truncate">{a.label}</span>
        </Button>
      ))}
      <Button
        key={primary.to_status}
        className={
          "h-12 flex-[1.4] gap-1.5 px-2 text-sm " +
          (primary.tone === "danger"
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90")
        }
        onClick={() => onAction(primary)}
        disabled={workflow.loading}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{primary.label}</span>
      </Button>
    </>
  );
}

function SaveStatusChip({ autosave }: { autosave: AutosaveStatus | null }) {
  const ux = useSPKUX();
  // Prefer the real autosave status when the Canvas is bound to a live SPK.
  const state: "pending" | "saved" | "error" =
    autosave === "saving" || autosave === "pending"
      ? "pending"
      : autosave === "error"
        ? "error"
        : autosave === "saved" || autosave === "idle"
          ? "saved"
          : ux.saveStatus === "pending"
            ? "pending"
            : "saved";
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
        <Cloud className="h-3 w-3" />
        Gagal Sync
      </span>
    );
  }
  if (state === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
        <Cloud className="h-3 w-3" />
        Menyimpan…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
      <CheckCircle2 className="h-3 w-3" />
      Tersimpan
    </span>
  );
}

/**
 * QuickFinishSpk — one-click "Selesaikan SPK" shortcut for mechanic-side roles.
 *
 * Fast-forwards the workflow through work_completed → qc_pending → closed via
 * useSPKWorkflow.finishSpk(). WorkflowService gates the closing hop when
 * signature_mekanik is missing, so the mechanic is auto-scrolled to Section 11
 * with a clear toast instead of a silent no-op.
 */
const MECHANIC_ROLES = new Set<SpkActor>(["mechanic", "qc", "owner", "admin", "admin_cabang"]);
const IN_WORKSHOP = new Set(["in_progress", "work_completed", "qc_pending", "qc_failed"]);
function QuickFinishSpk({
  workflow,
  spkRow,
  role,
  hasMechanicSig,
}: {
  workflow: ReturnType<typeof useSPKWorkflow>;
  spkRow: any | null;
  role: SpkActor;
  hasMechanicSig: boolean;
}) {
  const [busy, setBusy] = useState(false);
  if (!spkRow || !workflow.runtimeAvailable) return null;
  if (!MECHANIC_ROLES.has(role)) return null;
  if (!IN_WORKSHOP.has(spkRow.status)) return null;

  const trigger = async () => {
    if (!hasMechanicSig) {
      toast.error("Tanda tangan mekanik belum diisi", {
        description: "Buka Section 11 — Final Check untuk membubuhkan tanda tangan.",
      });
      const el = document.getElementById("sec-approval");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setBusy(true);
    const res = await workflow.finishSpk("quick_finish");
    setBusy(false);
    if (res.ok) toast.success("SPK ditutup · Selesai");
    else toast.error("Gagal menyelesaikan SPK", { description: res.error });
  };

  return (
    <div className="space-y-1.5">
      {!hasMechanicSig && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Tanda tangan mekanik belum diisi.</strong> SPK tidak bisa
            ditutup tanpa signature di <em>Section 11 — Final Check</em>.
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={trigger}
        disabled={busy}
        className="w-full rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-300"
      >
        {busy ? "Menyelesaikan…" : "✅ Selesaikan SPK Sekarang (Fast-forward)"}
      </button>
    </div>
  );
}

