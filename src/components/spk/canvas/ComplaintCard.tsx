// Phase 5.3 — Customer Complaint (Catatan Customer + Waktu Estimasi/Konfirmasi).
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Clock, Check } from "lucide-react";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { PhotoDropzoneBound } from "./PhotoDropzoneBound";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";
import { cn } from "@/lib/utils";
import { SkipToNextButton } from "./SkipToNextButton";

export function ComplaintCard() {
  const section = useSectionBinding("complaint");
  const [note, setNote, noteMeta] = useBinding<string>("complaint_note", "");
  const [estimasi, setEstimasi, estMeta] = useBinding<string>("complaint_estimasi", "");
  const [konfirmasi, setKonfirmasi, konfMeta] = useBinding<string>("complaint_konfirmasi", "");
  if (!section.visible) return null;
  return (
    <CanvasSection index={3} title="Catatan Customer" role="sa" required forceOpen id="sec-complaint">
      <div className="space-y-3">
        {noteMeta.visible && (
        <div className="space-y-1.5" data-field="complaint_note">
          <FieldLabel required>Catatan Customer</FieldLabel>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={noteMeta.disabled}
            placeholder="Keluhan customer, temuan awal, permintaan khusus…"
            className={cn("min-h-[64px] text-[12.5px] resize-y bg-background", noteMeta.error && "border-primary")}
            aria-required
            aria-invalid={!!noteMeta.error}
          />
          {noteMeta.error && <p className="text-[10px] text-primary">{noteMeta.error}</p>}
          <SkipToNextButton sectionId="sec-complaint" show={!note.trim()} />
        </div>
        )}
        <PhotoDropzoneBound fieldKey="complaint_photos" label="Foto Bukti Keluhan" max={6} />
      </div>
    </CanvasSection>
  );
}