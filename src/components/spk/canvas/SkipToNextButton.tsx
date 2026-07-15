// Small "Skip & go to next section" CTA rendered under optional textareas.
// Reads section list from SPKUX and scrolls to the next section using the
// existing jumpTo helper. Silent when there is no next section or when the
// caller says the textarea already has content (`show=false`).
import { ArrowRight, Check } from "lucide-react";
import { useSPKUXSafe } from "./SPKUXContext";
import { cn } from "@/lib/utils";

interface Props {
  sectionId: string;
  show: boolean;
  className?: string;
}

export function SkipToNextButton({ sectionId, show, className }: Props) {
  const ux = useSPKUXSafe();
  if (!show || !ux) return null;
  const idx = ux.sections.findIndex((s) => s.id === sectionId);
  if (idx < 0) return null;
  const next = ux.sections[idx + 1];
  const hasNext = !!next;
  return (
    <div className={cn("flex justify-end", className)}>
      <button
        type="button"
        onClick={() => {
          ux.ackSection(sectionId);
          if (hasNext) {
            // Small delay so the "Selesai" pill can render before we scroll.
            window.setTimeout(() => ux.jumpTo(next!.id), 120);
          }
        }}
        className="inline-flex min-h-tap items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Check className="h-3.5 w-3.5" />
        {hasNext ? `Lanjut ke ${next!.label}` : "Tandai Selesai"}
        {hasNext && <ArrowRight className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}