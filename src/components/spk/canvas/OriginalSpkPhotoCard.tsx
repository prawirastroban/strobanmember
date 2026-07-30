// Lampiran foto SPK asli (formulir kertas) di Canvas.
import { FileImage } from "lucide-react";
import { CanvasSection } from "./CanvasSection";
import { PhotoDropzoneBound } from "./PhotoDropzoneBound";

export function OriginalSpkPhotoCard({ spkId }: { spkId?: string | null }) {
  return (
    <CanvasSection
      index={0}
      title="Foto SPK Asli"
      subtitle="Lampiran foto formulir SPK kertas sebagai bukti dokumen fisik."
      role="sa"
      id="sec-original-photos"
    >
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <FileImage className="h-3.5 w-3.5" />
          Foto akan tampil di PDF dan halaman pelacakan customer.
        </p>
        <PhotoDropzoneBound
          fieldKey="original_spk_photos"
          label="Foto SPK Asli"
          max={6}
          spkId={spkId}
        />
      </div>
    </CanvasSection>
  );
}
