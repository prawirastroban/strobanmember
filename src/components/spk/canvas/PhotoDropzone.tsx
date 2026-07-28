// Phase 5.3A — Photo attachment placeholder. UI only; Runtime will bind uploads later.
import { useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoDropzoneProps {
  label?: string;
  max?: number;
  className?: string;
}

export function PhotoDropzone({ label = "Foto Pendukung", max = 6, className }: PhotoDropzoneProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const addStub = () => {
    if (slots.length >= max) return;
    setSlots((s) => [...s, `photo-${s.length + 1}`]);
  };
  const remove = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  return (
    <div className={cn("w-full max-w-full space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 break-words text-[clamp(0.66rem,1.9vw,0.75rem)] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-[clamp(0.62rem,1.8vw,0.7rem)] text-muted-foreground">
          {slots.length}/{max}
        </span>
      </div>
      <div
        className="grid w-full max-w-full gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 4.5rem), 1fr))" }}
      >
        {slots.map((s, i) => (
          <div
            key={s}
            className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/40"
          >
            <div className="flex h-full items-center justify-center text-muted-foreground/70">
              <Camera className="h-4 w-4" />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow group-hover:flex"
              aria-label="Hapus foto"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {slots.length < max && (
          <button
            type="button"
            onClick={addStub}
            className="flex aspect-square min-h-tap flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/20 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ImagePlus className="h-4 w-4" />
            Tambah
          </button>
        )}
      </div>
    </div>
  );
}