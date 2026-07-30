// Lampiran foto SPK — upload sungguhan ke bucket `spk-photos`.
// Controlled: `value` + `onChange`. Mendukung kamera & galeri, kompresi
// otomatis, hapus, dan preview besar.
import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  deleteSpkPhoto,
  uploadSpkPhoto,
  type SpkPhoto,
} from "@/lib/spk/spkPhotos";

interface PhotoDropzoneProps {
  label?: string;
  max?: number;
  className?: string;
  value?: SpkPhoto[];
  onChange?: (next: SpkPhoto[]) => void;
  spkId?: string | null;
  uploadedByName?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function PhotoDropzone({
  label = "Foto Pendukung",
  max = 6,
  className,
  value,
  onChange,
  spkId,
  uploadedByName,
  disabled,
  readOnly,
}: PhotoDropzoneProps) {
  const photos = value ?? [];
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const canAdd = !readOnly && !disabled && photos.length < max;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !onChange) return;
    const room = max - photos.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (!list.length) return;
    setBusy(true);
    const added: SpkPhoto[] = [];
    for (const file of list) {
      try {
        added.push(await uploadSpkPhoto(file, { spkId, uploadedByName }));
      } catch (e: any) {
        toast.error(e?.message ?? "Gagal mengunggah foto");
      }
    }
    if (added.length) {
      onChange([...photos, ...added]);
      toast.success(`${added.length} foto terlampir`);
    }
    setBusy(false);
  };

  const remove = async (i: number) => {
    if (!onChange) return;
    const target = photos[i];
    onChange(photos.filter((_, idx) => idx !== i));
    if (target?.path) {
      try {
        await deleteSpkPhoto(target.path);
      } catch {
        /* file yatim tidak memblokir UI */
      }
    }
  };

  return (
    <div className={cn("w-full max-w-full space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 break-words text-[clamp(0.66rem,1.9vw,0.75rem)] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-[clamp(0.62rem,1.8vw,0.7rem)] text-muted-foreground">
          {photos.length}/{max}
        </span>
      </div>

      <div
        className="grid w-full max-w-full gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 4.5rem), 1fr))" }}
      >
        {photos.map((p, i) => (
          <div
            key={p.path || p.url || i}
            className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/40"
          >
            <button
              type="button"
              onClick={() => setZoom(p.url)}
              className="h-full w-full"
              aria-label="Perbesar foto"
            >
              <img src={p.url} alt={`${label} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
            {!readOnly && !disabled && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                aria-label="Hapus foto"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {canAdd && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="flex aspect-square min-h-tap flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/20 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Kamera
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="flex aspect-square min-h-tap flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/20 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Galeri
            </button>
          </>
        )}
      </div>

      {readOnly && photos.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Belum ada foto.</p>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl p-2">
          {zoom && <img src={zoom} alt={label} className="max-h-[80vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
