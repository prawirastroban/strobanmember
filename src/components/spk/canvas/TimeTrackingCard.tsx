// Phase 5.3 — Time Tracking Summary. Live view of the auto-timestamps that
// WorkflowService writes on each status transition (in_progress → closed).
// Read-only: no manual editing here; values come from runtime.values (kept
// in sync with spk_orders.data via autosave).
import { CanvasSection } from "./CanvasSection";
import { Clock } from "lucide-react";
import { useFormRuntimeSafe } from "@/hooks/spk/FormRuntimeProvider";

const F = (v: unknown) =>
  v === undefined || v === null || v === "" ? "—" : String(v);

function formatDate(v: unknown) {
  const raw = typeof v === "string" ? v : "";
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function TimeTrackingCard() {
  const rt = useFormRuntimeSafe();
  const v = (rt?.values ?? {}) as Record<string, unknown>;
  const hasAny =
    !!v.date_in || !!v.time_in || !!v.time_start || !!v.time_end || !!v.time_duration;
  const rows: { label: string; value: string }[] = [
    { label: "Tanggal Masuk", value: formatDate(v.date_in) },
    { label: "Tanggal Keluar", value: formatDate(v.date_out) },
    { label: "Waktu Masuk", value: F(v.time_in) },
    { label: "Waktu Keluar", value: F(v.time_out) },
    { label: "Waktu Mulai", value: F(v.time_start) },
    { label: "Waktu Selesai", value: F(v.time_end) },
    { label: "Durasi", value: F(v.time_duration) },
    { label: "Mekanik", value: F(v.mechanic_name) },
  ];
  return (
    <CanvasSection
      index={10}
      title="Time Tracking Summary"
      subtitle="Otomatis dari timeline events — tidak dapat diedit manual."
      role="system"
      id="sec-time"
    >
      <ul className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
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
      {!hasAny && (
        <p className="mt-2 rounded-md border border-dashed border-border bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          Terisi otomatis saat status SPK berpindah ke <strong>Dikerjakan</strong>.
          Jika tetap kosong setelah pengerjaan dimulai, refresh halaman ini.
        </p>
      )}
    </CanvasSection>
  );
}