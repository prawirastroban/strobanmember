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
    <CanvasSection index={3} title="Customer Complaint" role="sa" required forceOpen id="sec-complaint">
      <div className="space-y-3">
        {noteMeta.visible && (
        <div className="space-y-1.5" data-field="complaint_note">
          <FieldLabel required>Catatan Customer</FieldLabel>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={noteMeta.disabled}
            placeholder="Keluhan customer, temuan awal, permintaan khusus…"
            className={cn("min-h-[100px] resize-y bg-background", noteMeta.error && "border-primary")}
            aria-required
            aria-invalid={!!noteMeta.error}
          />
          {noteMeta.error && <p className="text-[10px] text-primary">{noteMeta.error}</p>}
          <SkipToNextButton sectionId="sec-complaint" show={!note.trim()} />
        </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {estMeta.visible && (
          <div className="min-w-0 space-y-1.5" data-field="complaint_estimasi">
            <FieldLabel>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Waktu Estimasi
              </span>
            </FieldLabel>
            <Input
              value={estimasi}
              onChange={(e) => setEstimasi(e.target.value)}
              disabled={estMeta.disabled}
              className="h-11"
              placeholder="mis. 2 jam"
            />
          </div>
          )}
          {konfMeta.visible && (
          <div className="min-w-0 space-y-1.5" data-field="complaint_konfirmasi">
            <FieldLabel>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> Waktu Konfirmasi
              </span>
            </FieldLabel>
            <Input
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              disabled={konfMeta.disabled}
              className="h-11"
              placeholder="mis. 14:30"
            />
          </div>
          )}
        </div>
        <PhotoDropzoneBound fieldKey="complaint_photos" label="Foto Bukti Keluhan" max={6} />
      </div>
    </CanvasSection>
  );
}