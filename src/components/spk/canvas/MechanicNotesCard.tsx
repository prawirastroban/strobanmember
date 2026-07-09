// Phase 5.3 — Mechanic Notes + Catatan Jeda.
import { Textarea } from "@/components/ui/textarea";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { PhotoDropzone } from "./PhotoDropzone";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";
import { cn } from "@/lib/utils";

export function MechanicNotesCard() {
  const section = useSectionBinding("notes");
  const [note, setNote, noteMeta] = useBinding<string>("mechanic_note", "");
  const [pause, setPause, pauseMeta] = useBinding<string>("mechanic_catatan_jeda", "");
  if (!section.visible) return null;
  return (
    <CanvasSection index={9} title="Mechanic Notes" role="mechanic" id="sec-notes">
      <div className="space-y-3">
        {noteMeta.visible && (
        <div className="space-y-1.5" data-field="mechanic_note">
          <FieldLabel>Note by Mechanic</FieldLabel>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={noteMeta.disabled}
            placeholder="Temuan detail, rekomendasi ke customer, dan tindak lanjut…"
            className={cn("min-h-[110px] resize-y bg-background", noteMeta.error && "border-primary")}
          />
        </div>
        )}
        {pauseMeta.visible && (
        <div className="space-y-1.5" data-field="mechanic_catatan_jeda">
          <FieldLabel>Catatan Jeda</FieldLabel>
          <Textarea
            value={pause}
            onChange={(e) => setPause(e.target.value)}
            disabled={pauseMeta.disabled}
            placeholder="Alasan pause: menunggu part / konfirmasi customer / test drive…"
            className="min-h-[80px] resize-y bg-background"
          />
        </div>
        )}
        <PhotoDropzone label="Foto Temuan Mekanik" max={8} />
      </div>
    </CanvasSection>
  );
}