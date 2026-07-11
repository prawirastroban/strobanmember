// Phase 5.4A — Approval & Signature bound to Form Runtime.
import { CheckCircle2 } from "lucide-react";
import { CanvasSection } from "./CanvasSection";
import { SignaturePadBound } from "./SignaturePadBound";
import { cn } from "@/lib/utils";
import {
  useBinding,
  useFormRuntimeSafe,
  useSectionBinding,
} from "@/hooks/spk/FormRuntimeProvider";

const CHECKS = [
  { code: "approval_as_order", label: "Sudah Dikerjakan Sesuai Order", requires: "mekanik" as const },
  { code: "approval_clean", label: "Mobil Dalam Kondisi Bersih", requires: "any" as const },
];

export function ApprovalCard() {
  const section = useSectionBinding("approval");
  const rt = useFormRuntimeSafe();
  const matrix = rt?.approvalMatrix;
  if (!section.visible) return null;
  const showFinalCheck = matrix ? matrix.qc_required : true;
  const showFinal = matrix ? matrix.final_approval : true;
  const filteredChecks = CHECKS.filter((c) => (c.requires === "mekanik" ? showFinalCheck : true));
  return (
    <CanvasSection index={11} title="Approval & Signature" role="mechanic" required id="sec-approval">
      <div className="space-y-4">
        {filteredChecks.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              Final Check
            </p>
            <div className="grid grid-cols-1 gap-2">
              {filteredChecks.map((c) => (
                <ApprovalCheck key={c.code} code={c.code} label={c.label} />
              ))}
            </div>
          </div>
        )}

        {showFinal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SignaturePadBound code="signature_admin" label="Admin / Sales Advisor" />
            <SignaturePadBound code="signature_customer" label="Customer" />
            <SignaturePadBound code="signature_mekanik" label="Mekanik — Final Check" />
          </div>
        )}

        {!showFinalCheck && !showFinal && (
          <p className="text-xs text-muted-foreground">
            Approval matrix menonaktifkan Final Check Mekanik dan Final Approval — tidak ada langkah persetujuan yang wajib.
          </p>
        )}
      </div>
    </CanvasSection>
  );
}

function ApprovalCheck({ code, label }: { code: string; label: string }) {
  const [on, setOn, meta] = useBinding<boolean>(code, false);
  if (!meta.visible) return null;
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      disabled={meta.disabled}
      data-field={code}
      className={cn(
        "flex min-h-tap items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
        on
          ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md border",
          on ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-muted/40",
        )}
      >
        {on && <CheckCircle2 className="h-4 w-4" />}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}