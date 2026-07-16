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
    <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
      <div className="bg-[color:#ff0000] text-white font-bold text-center py-2 uppercase tracking-wide text-sm">
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}