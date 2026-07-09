// Phase 5.3 — Time Tracking Summary (read-only, placeholder from runtime events).
import { CanvasSection } from "./CanvasSection";
import { Clock } from "lucide-react";

const ROWS: { label: string; value: string }[] = [
  { label: "Tanggal Masuk", value: "12 Feb 2026" },
  { label: "Tanggal Keluar", value: "12 Feb 2026" },
  { label: "Waktu Masuk", value: "08:15" },
  { label: "Waktu Keluar", value: "—" },
  { label: "Waktu Mulai", value: "08:32" },
  { label: "Waktu Selesai", value: "—" },
  { label: "Waktu Jeda", value: "10:05" },
  { label: "Waktu Mulai Kembali", value: "10:22" },
];

export function TimeTrackingCard() {
  return (
    <CanvasSection
      index={10}
      title="Time Tracking Summary"
      subtitle="Otomatis dari timeline events — tidak dapat diedit manual."
      role="system"
      id="sec-time"
    >
      <ul className="grid grid-cols-2 gap-2">
        {ROWS.map((r) => (
          <li
            key={r.label}
            className="flex flex-col rounded-lg border border-border bg-muted/20 px-3 py-2"
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {r.label}
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
              <Clock className="h-3 w-3 text-muted-foreground" /> {r.value}
            </span>
          </li>
        ))}
      </ul>
    </CanvasSection>
  );
}