// Phase 5.3 — Digital SPK Canvas: single-document assembly of all sections,
// matching the paper Stroban Service Report ordering. Design-only, no runtime.
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CloudUpload, Pause, Save } from "lucide-react";
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

const SECTIONS: { id: string; label: string; role: "sa" | "mechanic" | "qc" | "system" }[] = [
  { id: "sec-customer", label: "Customer", role: "sa" },
  { id: "sec-vehicle", label: "Vehicle", role: "sa" },
  { id: "sec-complaint", label: "Complaint", role: "sa" },
  { id: "sec-service-order", label: "Service Order", role: "sa" },
  { id: "sec-suspension", label: "Suspension", role: "mechanic" },
  { id: "sec-tyre", label: "Tyre", role: "mechanic" },
  { id: "sec-ac", label: "AC", role: "mechanic" },
  { id: "sec-engine", label: "Engine", role: "mechanic" },
  { id: "sec-notes", label: "Notes", role: "mechanic" },
  { id: "sec-time", label: "Time", role: "system" },
  { id: "sec-approval", label: "Approval", role: "qc" },
];

const ROLE_DOT: Record<"sa" | "mechanic" | "qc" | "system", string> = {
  sa: "bg-sky-500/70",
  mechanic: "bg-amber-500/80",
  qc: "bg-emerald-500/80",
  system: "bg-muted-foreground/50",
};

export default function SPKCanvas() {
  return (
    <FormRuntimeProvider
      templateCode="spk_service_report"
      initialValues={INITIAL_VALUES}
    >
      <SPKCanvasInner />
    </FormRuntimeProvider>
  );
}

function SPKCanvasInner() {
  const navigate = useNavigate();
  const { id } = useParams();
  const runtime = useFormRuntime();

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

  const jumpTo = (secId: string) => {
    const el = document.getElementById(secId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
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
            <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
              Digital SPK
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {CANVAS_META.spkNumber}
              {id ? <span className="text-muted-foreground"> · {id}</span> : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="border border-primary/30 bg-primary/15 text-primary hover:bg-primary/20">
              {CANVAS_META.status}
            </Badge>
            <RuntimeStatusChip />
          </div>
        </div>
        {/* Section jump nav */}
        <nav
          aria-label="SPK sections"
          className="mx-auto max-w-2xl overflow-x-auto px-3 pb-2 [-webkit-overflow-scrolling:touch]"
        >
          <ul className="flex min-w-max items-center gap-1.5">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(s.id)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[s.role]}`} />
                  <span className="tabular-nums opacity-70">{i + 1}</span>
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
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

function RuntimeStatusChip() {
  const rt = useFormRuntime();
  const label =
    rt.status === "loading"
      ? "Loading runtime…"
      : rt.status === "ready"
        ? "Runtime bound"
        : rt.status === "no_template"
          ? "Runtime idle · no template"
          : "Runtime error";
  const dot =
    rt.status === "ready"
      ? "bg-emerald-500"
      : rt.status === "loading"
        ? "bg-amber-500 animate-pulse"
        : rt.status === "no_template"
          ? "bg-muted-foreground/60"
          : "bg-primary";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <CloudUpload className="h-3 w-3" />
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}