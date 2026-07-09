// Phase 5.4A — Bound inspection row. Reads/writes a single OK/NOT/N/A field
// through the Form Runtime store. Falls back to local state when no template
// is seeded.
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { OkNotToggle, type OkNotValue } from "./OkNotToggle";
import { InspectionRow } from "./CanvasSection";

interface Props {
  label: string;
  code: string;
  showSc?: boolean;
  scCode?: string;
}

export function InspectionRowBound({ label, code, showSc, scCode }: Props) {
  const [value, setValue, meta] = useBinding<OkNotValue>(code, null);
  const [sc, setSc] = useBinding<boolean>(scCode ?? `${code}__sc`, false);

  if (!meta.visible) return null;

  return (
    <InspectionRow label={label}>
      <OkNotToggle
        value={value}
        onChange={setValue}
        size="sm"
        showSc={showSc}
        sc={sc}
        onScChange={setSc}
      />
    </InspectionRow>
  );
}