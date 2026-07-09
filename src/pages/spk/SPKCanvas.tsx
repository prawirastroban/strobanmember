// Phase 5.3 — Digital SPK Canvas: single-document assembly of all sections,
// matching the paper Stroban Service Report ordering. Design-only, no runtime.
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Pause,
  Save,
  ArrowRight,
  X,
  RefreshCw,
  Cloud,
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
import { FormRuntimeProvider, useFormRuntime } from "@/hooks/spk/FormRuntimeProvider";
import { SPKUXProvider, useSPKUX, type SectionMeta } from "@/components/spk/canvas/SPKUXContext";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const CANVAS_META = {
  spkNumber: "SPK-2026-000123",
  branch: "Stroban Ciputat",
  date: "12 Feb 2026",
  status: "Sedang Dikerjakan",
};

const INITIAL_VALUES: Record<string, unknown> = {
  customer_name: "Budi Santoso",
  customer_phone: "0812-3456-7890",
  customer_platform: "organik",
  vehicle_merk: "Toyota",
  vehicle_tipe: "Avanza 1.3 G",
  vehicle_tahun: "2020",
  vehicle_plate: "B 1234 XYZ",
  vehicle_mileage_now: "82.450",
  vehicle_mileage_next: "92.450",
  complaint_note:
    "Suara berdecit dari kaki-kaki saat melewati jalan rusak. AC kurang dingin di siang hari.",
  complaint_estimasi: "4 jam",
  complaint_konfirmasi: "Sudah dikonfirmasi via WhatsApp",
};

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
  { id: "sec-approval", label: "Approval", index: 11, role: "qc", requires: ["approval_as_order", "approval_clean"] },
];

const ROLE_DOT: Record<"sa" | "mechanic" | "qc" | "system", string> = {
  sa: "bg-sky-500/70",
  mechanic: "bg-amber-500/80",
  qc: "bg-emerald-500/80",
  system: "bg-muted-foreground/50",
};

export default function SPKCanvas() {
  const { id } = useParams();
  return (
    <FormRuntimeProvider
      templateCode="spk_service_report"
      initialValues={INITIAL_VALUES}
    >
      <SPKUXProvider spkId={id ?? CANVAS_META.spkNumber} sections={SECTIONS}>
        <SPKCanvasInner />
      </SPKUXProvider>
    </FormRuntimeProvider>
  );
}

function SPKCanvasInner() {
  const navigate = useNavigate();
  const runtime = useFormRuntime();
  const ux = useSPKUX();

  const onFinish = () => {
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
                {CANVAS_META.spkNumber}
              </p>
              <SaveStatusChip />
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
            {CANVAS_META.status}
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
          spkNumber={CANVAS_META.spkNumber}
          branch={CANVAS_META.branch}
          date={CANVAS_META.date}
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
            <span className="h-2 w-4 rounded-full bg-emerald-500/80" /> QC / Approval
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
        <div id="sec-time">
          <TimeTrackingCard />
        </div>
        <ApprovalCard />

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
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button variant="outline" className="h-12 flex-1 gap-1.5 px-2 text-sm">
            <Save className="h-4 w-4 shrink-0" />
            <span className="truncate">Simpan</span>
          </Button>
          <Button variant="outline" className="h-12 flex-1 gap-1.5 px-2 text-sm">
            <Pause className="h-4 w-4 shrink-0" />
            <span className="truncate">Pause</span>
          </Button>
          <Button
            className="h-12 flex-[1.4] gap-1.5 bg-primary px-2 text-sm text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90"
            onClick={onFinish}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Selesaikan</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaveStatusChip() {
  const ux = useSPKUX();
  if (ux.saveStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
        <Cloud className="h-3 w-3" />
        Sync Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
      <CheckCircle2 className="h-3 w-3" />
      Saved
    </span>
  );
}

