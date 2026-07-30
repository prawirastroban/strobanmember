// PhotoDropzone yang terhubung ke Form Runtime (autosave canvas).
import { PhotoDropzone } from "./PhotoDropzone";
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { normalizeSpkPhotos, type SpkPhoto } from "@/lib/spk/spkPhotos";
import { useAuth } from "@/hooks/useAuth";

export function PhotoDropzoneBound({
  fieldKey,
  label,
  max = 6,
  spkId,
}: {
  fieldKey: string;
  label: string;
  max?: number;
  spkId?: string | null;
}) {
  const [raw, setRaw, meta] = useBinding<unknown>(fieldKey, []);
  const { user } = useAuth();
  const photos: SpkPhoto[] = normalizeSpkPhotos(raw);
  const who =
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    user?.email ||
    undefined;

  if (meta.visible === false) return null;

  return (
    <div data-field={fieldKey}>
      <PhotoDropzone
        label={label}
        max={max}
        value={photos}
        onChange={(next) => setRaw(next as unknown)}
        spkId={spkId}
        uploadedByName={who}
        disabled={meta.disabled}
      />
    </div>
  );
}
