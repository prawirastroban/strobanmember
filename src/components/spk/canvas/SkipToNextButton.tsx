// Small "Skip & go to next section" CTA rendered under optional textareas.
// Reads section list from SPKUX and scrolls to the next section using the
// existing jumpTo helper. Silent when there is no next section or when the
// caller says the textarea already has content (`show=false`).
import { ArrowRight } from "lucide-react";
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
  if (!next) return null;
  return (
    <div className={cn("flex justify-end", className)}>
      <button
        type="button"
        onClick={() => ux.jumpTo(next.id)}
        className="inline-flex min-h-tap items-center gap-1 rounded-full border border-dashed border-border bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
      >
        Lewati & lanjut ke {next.label}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}