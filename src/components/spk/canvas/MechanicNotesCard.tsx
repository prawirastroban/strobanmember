// Phase 5.3 — Mechanic Notes + Catatan Jeda.
import { Textarea } from "@/components/ui/textarea";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { PhotoDropzone } from "./PhotoDropzone";

export function MechanicNotesCard() {
  return (
    <CanvasSection index={9} title="Mechanic Notes" role="mechanic" id="sec-notes">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <FieldLabel>Note by Mechanic</FieldLabel>
          <Textarea
            placeholder="Temuan detail, rekomendasi ke customer, dan tindak lanjut…"
            className="min-h-[110px] resize-y bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Catatan Jeda</FieldLabel>
          <Textarea
            placeholder="Alasan pause: menunggu part / konfirmasi customer / test drive…"
            className="min-h-[80px] resize-y bg-background"
          />
        </div>
        <PhotoDropzone label="Foto Temuan Mekanik" max={8} />
      </div>
    </CanvasSection>
  );
}