// Phase 5.3 — Digital SPK Canvas: single-document assembly of all sections,
// matching the paper Stroban Service Report ordering. Design-only, no runtime.
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Pause, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { CanvasHeader } from "@/components/spk/canvas/CanvasHeader";
import { useState } from "react";
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

const CANVAS_META = {
  spkNumber: "SPK-2026-000123",
  branch: "Stroban Ciputat",
  date: "12 Feb 2026",
  status: "Sedang Dikerjakan",
};

export default function SPKCanvas() {
  const navigate = useNavigate();
  const { id } = useParams();

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
          <Badge className="border border-primary/30 bg-primary/15 text-primary hover:bg-primary/20">
            {CANVAS_META.status}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <CanvasHeader
          spkNumber={CANVAS_META.spkNumber}
          branch={CANVAS_META.branch}
          date={CANVAS_META.date}
        />
        <CustomerBlock />
        <VehicleCard
          merk="Toyota"
          tipe="Avanza 1.3 G"
          tahun="2020"
          plate="B 1234 XYZ"
          mileageNow="82.450"
          mileageNext="92.450"
        />
        <ComplaintCard
          complaint="Suara berdecit dari kaki-kaki saat melewati jalan rusak. AC kurang dingin di siang hari."
          estimasi="4 jam"
          konfirmasi="Sudah dikonfirmasi via WhatsApp"
        />
        <ServiceOrderCard />
        <InspectionSuspensionCard />
        <TyreCheckCard />
        <ACCheckCard />
        <InspectionEngineCard />
        <MechanicNotesCard />
        <TimeTrackingCard />
        <ApprovalCard />

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          Dokumen ini adalah Living SPK — setiap peran memperbarui bagian yang
          menjadi tanggung jawabnya. Struktur diselaraskan dengan Service Report Stroban.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button variant="outline" className="h-12 flex-1 gap-2">
            <Save className="h-4 w-4" />
            Simpan
          </Button>
          <Button variant="outline" className="h-12 flex-1 gap-2">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
          <Button className="h-12 flex-[1.2] gap-2 bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90">
            <CheckCircle2 className="h-4 w-4" />
            Selesaikan
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomerBlock() {
  const [platform, setPlatform] = useState<"iklan" | "organik" | null>("organik");
  return (
    <CustomerCard
      name="Budi Santoso"
      phone="0812-3456-7890"
      platform={platform}
      onPlatformChange={setPlatform}
    />
  );
}