// Runtime-bound signature pad. Persists dataURL PNG into spk_orders.data.<code>
// so the SPK Print/PDF can render it. Falls back to local state when there
// is no valid SPK id (design preview).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { SignaturePad } from "./SignaturePad";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function SignaturePadBound({ code, label }: { code: string; label: string }) {
  const { id } = useParams();
  const [value, setValue, meta] = useBinding<string | null>(code, null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Persist to DB (debounced) whenever the local runtime value changes.
  const persist = (data: string | null) => {
    if (!id || !UUID_RE.test(id)) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const { data: row } = await supabase
          .from("spk_orders")
          .select("data")
          .eq("id", id)
          .maybeSingle();
        const nextData = { ...((row?.data as Record<string, unknown>) ?? {}), [code]: data };
        await supabase.from("spk_orders").update({ data: nextData as any }).eq("id", id);
      } finally {
        setSaving(false);
      }
    }, 400);
  };

  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);

  if (!meta.visible) return null;

  return (
    <div className="relative">
      <SignaturePad
        label={label}
        onChange={(dataUrl) => {
          setValue(dataUrl);
          persist(dataUrl);
        }}
      />
      {value && !saving && (
        <span className="absolute right-2 top-6 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
          <CheckCircle2 className="h-2.5 w-2.5" /> Tersimpan
        </span>
      )}
    </div>
  );
}