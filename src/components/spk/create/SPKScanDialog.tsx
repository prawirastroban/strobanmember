// Scan SPK — ambil foto formulir kertas (kamera/galeri) → OCR → Preview Card.
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ImageIcon, Loader2, RefreshCw, ScanLine, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPKScanPreview } from "./SPKScanPreview";
import { uploadSpkPhotoFromDataUrl } from "@/lib/spk/spkPhotos";
import {
  buildPrefill,
  composePrefill,
  saveScanPrefill,
  type OcrScanResult,
  type SpkScanPrefill,
} from "@/lib/spk/ocrPrefill";

type Step = "capture" | "processing" | "preview";

/** Resize sisi terpanjang ke maks 1600px & encode JPEG q0.8 agar OCR cepat. */
async function compressImage(file: File): Promise<{ base64: string; preview: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Gagal membaca file"));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Gagal memuat gambar"));
    el.src = dataUrl;
  });
  const max = 1600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { base64: dataUrl.split(",")[1] ?? "", preview: dataUrl };
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", 0.8);
  return { base64: out.split(",")[1] ?? "", preview: out };
}

export function SPKScanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [base, setBase] = useState<SpkScanPrefill | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  const reset = () => {
    setStep("capture");
    setPreview(null);
    setValues({});
    setBase(null);
    setCheckCount(0);
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar");
      return;
    }
    setStep("processing");
    try {
      const { base64, preview: p } = await compressImage(file);
      setPreview(p);
      const { data, error } = await supabase.functions.invoke("spk-ocr-scan", {
        body: { image_base64: base64, mime_type: "image/jpeg" },
      });
      if (error) {
        let msg = "Gagal memproses OCR";
        try {
          const body = await (error as any)?.context?.json?.();
          if (body?.error) msg = body.error;
        } catch { /* abaikan */ }
        toast.error(msg);
        setStep("capture");
        return;
      }
      if ((data as any)?.error) {
        toast.error(String((data as any).error));
        setStep("capture");
        return;
      }
      const result = data as OcrScanResult;
      const built = buildPrefill(result);
      setBase(built);
      setValues(built.form);
      setCheckCount(Object.keys(result.checks ?? {}).length);
      setStep("preview");
    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses foto");
      setStep("capture");
    }
  };

  const [attaching, setAttaching] = useState(false);

  const useData = async () => {
    if (!base) return;
    // Foto hasil scan otomatis ikut terlampir sebagai foto SPK asli.
    let extra = base.extraData;
    if (preview) {
      setAttaching(true);
      try {
        const photo = await uploadSpkPhotoFromDataUrl(preview);
        extra = { ...extra, original_spk_photos: [photo] };
      } catch {
        toast.error("Foto SPK asli gagal dilampirkan, data tetap dilanjutkan");
      }
      setAttaching(false);
    }
    saveScanPrefill(composePrefill(values, extra, base.lowConfidence));
    close(false);
    navigate("/spk/new?source=scan");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4 text-primary" /> Scan SPK Kertas
          </DialogTitle>
          <DialogDescription className="text-xs">
            Foto formulir SPK, sistem membaca isinya otomatis. Semua hasil tetap bisa diedit.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />

        {step === "capture" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm font-medium transition-colors hover:border-primary/60 hover:text-primary"
              >
                <Camera className="h-6 w-6" /> Buka Kamera
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm font-medium transition-colors hover:border-primary/60 hover:text-primary"
              >
                <ImageIcon className="h-6 w-6" /> Pilih dari Galeri
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tips: pastikan seluruh lembar masuk frame, tegak lurus, dan pencahayaan cukup.
            </p>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            {preview && (
              <img
                src={preview}
                alt="Pratinjau foto SPK"
                className="max-h-40 w-auto max-w-full rounded-lg border border-border object-contain"
              />
            )}
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Membaca formulir…</p>
            <p className="text-xs text-muted-foreground">Biasanya butuh 10–25 detik.</p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {preview && (
              <img
                src={preview}
                alt="Foto SPK yang discan"
                className="max-h-36 w-auto max-w-full rounded-lg border border-border object-contain"
              />
            )}
            <SPKScanPreview
              values={values}
              lowConfidence={base?.lowConfidence ?? []}
              checkCount={checkCount}
              onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
            />
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {step === "preview" ? (
            <>
              <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={reset}>
                <RefreshCw className="h-4 w-4" /> Scan Ulang
              </Button>
              <Button
                className="w-full gap-2 sm:w-auto"
                disabled={attaching}
                onClick={() => void useData()}
              >
                {attaching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {attaching ? "Melampirkan foto…" : "Gunakan Data Ini"}
              </Button>
            </>
          ) : (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => close(false)}>
              Batal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
