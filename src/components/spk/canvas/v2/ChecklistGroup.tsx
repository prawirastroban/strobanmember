// SPK Canvas v2 — grouped checklist (header merah + rows).
import { ReactNode } from "react";

export function ChecklistGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden mb-6 shadow-sm">
      <div className="flex items-center gap-2 border-b border-white/10 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-2.5">
        <span className="h-4 w-1 rounded-full bg-primary/70" />
        <span className="font-semibold uppercase tracking-wider text-xs text-foreground">
          {title}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-white/5">{children}</div>
    </div>
  );
}