// SPK Canvas v2 — paper-style checklist group (grey strip head + ruled rows).
import { ReactNode } from "react";

export function ChecklistGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-border first:border-t-0">
      <div className="bg-muted px-2 py-1 text-center text-[10.5px] font-bold uppercase tracking-[.07em] text-foreground">
        {title}
      </div>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </div>
  );
}
