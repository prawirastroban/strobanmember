// Phase 5.3 — Digital SPK Canvas: single-document assembly of all sections,
// matching the paper Stroban Service Report ordering. Design-only, no runtime.
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  ArrowRight,
  X,
  RefreshCw,
  Cloud,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { CanvasHeader } from "@/components/spk/canvas/CanvasHeader";
import { CustomerCard } from "@/components/spk/canvas/CustomerCard";
import { VehicleCard } from "@/components/spk/canvas/VehicleCard";
import { ComplaintCard } from "@/components/spk/canvas/ComplaintCard";
import { ServiceOrderCard } from "@/components/spk/canvas/ServiceOrderCard";
import { InspectionSuspensionCard } from "@/components/spk/canvas/InspectionSuspensionCard";
import { TyreCheckCard } from "@/components/spk/canvas/TyreCheckCard";
import { ACCheckCard } from "@/components/spk/canvas/ACCheckCard";
import { InspectionEngineCard } from "@/components/spk/canvas/InspectionEngineCard";
import { MechanicNotesCard } from "@/components/spk/canvas/MechanicNotesCard";
import { TimeTrackingCard } from "@/components/spk/canvas/TimeTrackingCard";
import { ApprovalCard } from "@/components/spk/canvas/ApprovalCard";
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
import { AlertTriangle, MessageSquareWarning, Send } from "lucide-react";
import { PenLine } from "lucide-react";
import { SignaturePad } from "@/components/spk/canvas/SignaturePad";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  { id: "sec-suspension", label: "Suspension", index: 5, role: "mechanic", requires: ["insp_suspension_part_replacement"] },
  { id: "sec-tyre", label: "Tyre", index: 6, role: "mechanic", requires: ["tyre_fl_status", "tyre_fr_status", "tyre_rl_status", "tyre_rr_status"] },
  { id: "sec-ac", label: "AC", index: 7, role: "mechanic", requires: ["ac_remarks"] },
  { id: "sec-engine", label: "Engine", index: 8, role: "mechanic", requires: ["engine_service_lainnya"] },
  { id: "sec-notes", label: "Notes", index: 9, role: "mechanic", requires: ["mechanic_note"] },
  { id: "sec-time", label: "Time", index: 10, role: "system", requires: [] },
  { id: "sec-approval", label: "Approval", index: 11, role: "mechanic", requires: ["approval_as_order", "approval_clean"] },
];

const ROLE_DOT: Record<"sa" | "mechanic" | "qc" | "system", string> = {
  sa: "bg-sky-500/70",
  mechanic: "bg-amber-500/80",
  qc: "bg-emerald-500/80",
  system: "bg-muted-foreground/50",
};

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

  const jumpTo = ux.jumpTo;
  const currentSection = SECTIONS.find((s) => s.id === ux.currentSectionId) ?? SECTIONS[0];
  const resumeSection = ux.resumeSectionId
    ? SECTIONS.find((s) => s.id === ux.resumeSectionId) ?? null
    : null;

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
              <span className="tabular-nums">{currentSection.index}.</span> {currentSection.label}
              <span className="mx-1.5 text-muted-foreground/60">·</span>
              <span className="font-medium text-foreground">
                {ux.completedCount}/{ux.totalCount}
              </span>{" "}
              bagian selesai
            </p>
          </div>
          <Badge className="shrink-0 border border-primary/30 bg-primary/15 text-primary hover:bg-primary/20">
            {meta.status}
          </Badge>
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
        {/* Workflow phase strip */}
        <WorkflowPhaseStrip status={spkRow?.status ?? null} />
        {/* Section jump nav */}
        <nav
          aria-label="SPK sections"
          className="mx-auto max-w-2xl overflow-x-auto px-3 py-2 [-webkit-overflow-scrolling:touch]"
        >
          <ul className="flex min-w-max items-center gap-1.5">
            {SECTIONS.map((s) => {
              const status = ux.statuses[s.id];
              const isCurrent = ux.currentSectionId === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(s.id)}
                    aria-current={isCurrent ? "true" : undefined}
                    className={
                      "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                      (isCurrent
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : status === "complete"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : status === "in_progress"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/60 hover:text-foreground")
                    }
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[s.role]}`} />
                    <span className="tabular-nums opacity-70">{s.index}</span>
                    <span>{s.label}</span>
                    {status === "complete" && <CheckCircle2 className="h-3 w-3" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {resumeSection && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5">
            <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-primary/80">
                Lanjutkan dari terakhir
              </p>
              <p className="truncate text-sm font-medium text-foreground">
                {resumeSection.index}. {resumeSection.label}
              </p>
            </div>
            <Button
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              onClick={() => {
                jumpTo(resumeSection.id);
                ux.dismissResume();
              }}
            >
              Lanjut <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              onClick={() => ux.dismissResume()}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <CanvasHeader
          spkNumber={meta.spkNumber}
          branch={meta.branch}
          date={meta.date}
        />

        <CustomerActionBanners
          spkId={spkId}
          spkRow={spkRow}
          setSpkRow={setSpkRow}
        />


        {/* Role legend — moved to top for scannability */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">Warna Tugas:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-sky-500/70" /> Sales Advisor
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-amber-500/80" /> Mekanik
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-emerald-500/80" /> Mekanik / Approval
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px]">
            <span className="text-primary">*</span> Wajib diisi
          </span>
        </div>

        <CustomerCard />
        <VehicleCard />
        <ComplaintCard />
        <ServiceOrderCard />
        <InspectionSuspensionCard />
        <TyreCheckCard />
        <ACCheckCard />
        <InspectionEngineCard />
        <MechanicNotesCard />
        <TimeTrackingCard />
        <ApprovalCard />

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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <StaffRevisionEscape spkId={spkId} spkRow={spkRow} role={role} setSpkRow={setSpkRow} />
          <CustomerBypassApprove
            spkId={spkId}
            spkRow={spkRow}
            role={role}
            userId={user?.id ?? null}
            setSpkRow={setSpkRow}
          />
          <QuickFinishSpk
            workflow={workflow}
            spkRow={spkRow}
            role={role}
            hasMechanicSig={Boolean((runtime.values as any)?.signature_mekanik)}
          />
          <div className="flex items-center gap-2">
          <WorkflowActionBar
            workflow={workflow}
            onAction={runAction}
            onFallbackFinish={onFinishFallback}
          />
          </div>
        </div>
      </div>
    </div>
  );
}

// Staff/Admin escape: when workflow rules "lock" the SPK at qc_pending /
// awaiting_customer_approval / closed_pending, allow returning the SPK to
// in_progress so a mechanic can revise. Uses workflow.runTransition first,
// falls back to a direct spk_orders update + timeline event insert.

// Workflow phase strip — visualizes the current SPK status against the
// canonical customer-facing flow. Uses spkRow.status directly; unknown
// statuses simply render every phase as upcoming (raw status Badge in the
// header still shows the exact value).
const WORKFLOW_PHASES: { key: string; label: string; matches: string[] }[] = [
  { key: "draft", label: "Draft", matches: ["draft"] },
  { key: "awaiting_customer_approval", label: "Persetujuan Customer", matches: ["awaiting_customer_approval"] },
  { key: "in_progress", label: "Pengerjaan Mekanik", matches: ["in_progress", "revision", "assigned", "work_completed"] },
  { key: "qc_pending", label: "Final Check Mekanik", matches: ["qc_pending", "qc_passed", "qc_failed"] },
  { key: "closed", label: "Selesai", matches: ["closed", "closed_pending", "invoice_issued", "invoice_paid"] },
];
function WorkflowPhaseStrip({ status }: { status: string | null }) {
  const activeIdx = status
    ? WORKFLOW_PHASES.findIndex((p) => p.matches.includes(status))
    : -1;
  return (
    <div className="mx-auto max-w-2xl overflow-x-auto px-3 pt-2 [-webkit-overflow-scrolling:touch]">
      <ol className="flex min-w-max items-center gap-1 text-[10px] font-medium">
        {WORKFLOW_PHASES.map((p, i) => {
          const isCurrent = i === activeIdx;
          const isDone = activeIdx >= 0 && i < activeIdx;
          return (
            <li key={p.key} className="flex items-center gap-1">
              <span
                className={
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 " +
                  (isCurrent
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : isDone
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border bg-muted/30 text-muted-foreground")
                }
              >
                <span className="tabular-nums opacity-70">{i + 1}</span>
                <span>{p.label}</span>
                {isDone && <CheckCircle2 className="h-3 w-3" />}
              </span>
              {i < WORKFLOW_PHASES.length - 1 && (
                <span className={"h-px w-3 " + (isDone ? "bg-emerald-500/50" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

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
    <button
      type="button"
      onClick={trigger}
      disabled={busy}
      className="w-full rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-300"
    >
      {busy ? "Menyelesaikan…" : "✅ Selesaikan SPK Sekarang (Fast-forward)"}
    </button>
  );
}

/**
 * CustomerActionBanners — surfaces states that require staff action or awareness
 * regarding the customer approval flow. Ensures buttons exist whenever a change
 * from the customer requires a staff response.
 *
 *   1) Customer requested revision → prominent alert + "Sudah Direvisi & Kirim Ulang" button.
 *   2) SPK awaiting customer approval → info banner with "Salin Link Approval" button
 *      so staff can re-share via WhatsApp when needed.
 */
function CustomerActionBanners({
  spkId,
  spkRow,
  setSpkRow,
}: {
  spkId: string | null;
  spkRow: any | null;
  setSpkRow: Dispatch<SetStateAction<any>>;
}) {
  if (!spkId || !spkRow) return null;
  const data = (spkRow.data ?? {}) as Record<string, any>;
  const revisionNote: string | undefined = data.customer_revision_note;
  const revisionAt: string | undefined = data.customer_revision_requested_at;
  const status: string = spkRow.status ?? "";
  const hasBooking = !!spkRow.booking_id;

  const clearRevision = async () => {
    const next = { ...data };
    delete next.customer_revision_note;
    delete next.customer_revision_requested_at;
    next.customer_revision_resolved_at = new Date().toISOString();
    const { error } = await supabase
      .from("spk_orders")
      .update({ data: next as any })
      .eq("id", spkId);
    if (error) {
      toast.error("Gagal menandai revisi", { description: error.message });
      return;
    }
    setSpkRow((r: any) => ({ ...(r ?? {}), data: next }));
    toast.success("Revisi ditandai selesai — customer bisa approve ulang.");
  };

  const copyApprovalLink = async () => {
    const url = `${window.location.origin}/spk/${spkId}/approve`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link approval disalin", { description: url });
    } catch {
      toast.message("Salin manual", { description: url });
    }
  };

  return (
    <div className="space-y-2">
      {revisionNote && (
        <div className="rounded-xl border-2 border-destructive/50 bg-destructive/5 p-3">
          <div className="flex items-start gap-2">
            <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-destructive">
                Customer meminta revisi
              </p>
              {revisionAt && (
                <p className="text-[11px] text-muted-foreground">
                  {new Date(revisionAt).toLocaleString("id-ID")}
                </p>
              )}
              <p className="mt-1.5 rounded-md bg-background/60 px-2 py-1.5 text-sm">
                {revisionNote}
              </p>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={clearRevision}
            >
              <CheckCircle2 className="h-4 w-4" />
              Sudah Direvisi &amp; Kirim Ulang
            </Button>
          </div>
        </div>
      )}

      {status === "awaiting_customer_approval" && hasBooking && !revisionNote && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2.5">
          <Send className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Menunggu approval customer via aplikasi
            </p>
            <p className="text-[11px] text-muted-foreground">
              Customer akan menerima notifikasi & tombol approve di halaman booking-nya.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 shrink-0 border-amber-500/50 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
            onClick={copyApprovalLink}
          >
            Salin Link
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * CustomerBypassApprove — mechanic-device bypass so the customer can sign
 * directly on the workshop tablet when they're standing at the counter.
 * Only visible while the SPK is `awaiting_customer_approval` and the
 * operator is staff/admin/mechanic.
 *
 * Uses a direct update (staff has UPDATE RLS on spk_orders) rather than
 * the customer-scoped RPC, since the RPC checks auth.uid() = customer_id.
 */
function CustomerBypassApprove({
  spkId,
  spkRow,
  role,
  userId,
  setSpkRow,
}: {
  spkId: string | null;
  spkRow: any | null;
  role: SpkActor;
  userId: string | null;
  setSpkRow: Dispatch<SetStateAction<any>>;
}) {
  const ALLOWED = new Set<SpkActor>(["admin", "admin_cabang", "owner", "reception", "mechanic"]);
  const [open, setOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!spkId || !spkRow) return null;
  if (!ALLOWED.has(role)) return null;
  if (spkRow.status !== "awaiting_customer_approval") return null;

  const submit = async () => {
    if (!signature) {
      toast.error("Tanda tangan customer wajib diisi");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const nextData = {
        ...(spkRow.data ?? {}),
        signature_customer: signature,
        customer_approved_at: now,
        customer_approved_via: "workshop_device",
        customer_approved_by_staff: userId,
      };
      const { error } = await supabase
        .from("spk_orders")
        .update({ status: "qc_pending", data: nextData as any })
        .eq("id", spkId);
      if (error) throw error;
      await supabase.from("spk_events").insert({
        spk_id: spkId,
        event_type: "status_changed",
        payload: {
          from: "awaiting_customer_approval",
          to: "qc_pending",
          reason: "customer_bypass_approve",
          workflow_code: "spk_default",
        },
        actor_role: role,
      } as any);
      setSpkRow((r: any) => (r ? { ...r, status: "qc_pending", data: nextData } : r));
      toast.success("Persetujuan customer tersimpan (device bengkel)");
      setOpen(false);
      setSignature(null);
    } catch (e: any) {
      toast.error("Gagal menyimpan approval", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
      >
        ✍ Approve Customer di Device Bengkel (Bypass)
      </button>
      <Dialog open={open} onOpenChange={(o) => { if (!busy) { setOpen(o); if (!o) setSignature(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" /> Tanda Tangan Customer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Minta customer menandatangani di layar ini. SPK akan langsung
              melanjut ke tahap Final Check Mekanik setelah tersimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <SignaturePad
              label="Tanda tangan customer"
              onChange={(v) => setSignature(v)}
            />
            {!signature && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                Tanda tangan wajib diisi.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submit} disabled={busy || !signature} className="bg-primary text-primary-foreground">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {busy ? "Menyimpan…" : "Simpan Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

