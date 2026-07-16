// Merged card combining sections 9 (Mechanic Notes), 10 (Time Tracking) and
// 11 (Approval & Signature) into a single always-open form for cleaner UX.
import { Textarea } from "@/components/ui/textarea";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { PhotoDropzone } from "./PhotoDropzone";
import { SignaturePadBound } from "./SignaturePadBound";
import { CheckCircle2, Clock, StickyNote, Timer, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBinding,
  useFormRuntimeSafe,
  useSectionBinding,
} from "@/hooks/spk/FormRuntimeProvider";

const CHECKS = [
  { code: "approval_as_order", label: "Sudah Dikerjakan Sesuai Order" },
  { code: "approval_clean", label: "Mobil Dalam Kondisi Bersih" },
];

const F = (v: unknown) =>
  v === undefined || v === null || v === "" ? "—" : String(v);

function formatDate(v: unknown) {
  const raw = typeof v === "string" ? v : "";
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function FinalizationCard() {
  // Merge visibility: show the card if any of the three underlying sections
  // are visible for the active role.
  const notes = useSectionBinding("notes");
  const time = useSectionBinding("time");
  const approval = useSectionBinding("approval");
  if (!notes.visible && !time.visible && !approval.visible) return null;

  return (
    <CanvasSection
      index={9}
      title="Finalisasi Pengerjaan"
      subtitle="Catatan mekanik, ringkasan waktu, dan approval akhir dalam satu form."
      role="mechanic"
      required
      forceOpen
      id="sec-finalization"
    >
      <div className="space-y-5">
        {notes.visible && <NotesBlock />}
        {time.visible && <TimeBlock />}
        {approval.visible && <ApprovalBlock />}
      </div>
    </CanvasSection>
  );
}

function BlockHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="text-primary/80">{icon}</span>
      <span>{title}</span>
      <span className="ml-1 h-px flex-1 bg-border/60" />
    </div>
  );
}

function NotesBlock() {
  const [note, setNote, noteMeta] = useBinding<string>("mechanic_note", "");
  const [pause, setPause, pauseMeta] = useBinding<string>("mechanic_catatan_jeda", "");
  return (
    <div>
      <BlockHeading icon={<StickyNote className="h-3.5 w-3.5" />} title="Catatan Mekanik" />
      <div className="space-y-3">
        {noteMeta.visible && (
          <div className="space-y-1.5" data-field="mechanic_note">
            <FieldLabel>Note by Mechanic</FieldLabel>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={noteMeta.disabled}
              placeholder="Temuan detail, rekomendasi ke customer, dan tindak lanjut…"
              className={cn(
                "min-h-[100px] resize-y bg-background",
                noteMeta.error && "border-primary",
              )}
            />
          </div>
        )}
        {pauseMeta.visible && (
          <div className="space-y-1.5" data-field="mechanic_catatan_jeda">
            <FieldLabel>Catatan Jeda</FieldLabel>
            <Textarea
              value={pause}
              onChange={(e) => setPause(e.target.value)}
              disabled={pauseMeta.disabled}
              placeholder="Alasan pause: menunggu part / konfirmasi customer / test drive…"
              className="min-h-[70px] resize-y bg-background"
            />
          </div>
        )}
        <PhotoDropzone label="Foto Temuan Mekanik" max={8} />
      </div>
    </div>
  );
}

function TimeBlock() {
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
    <div>
      <BlockHeading icon={<Timer className="h-3.5 w-3.5" />} title="Ringkasan Waktu Pengerjaan" />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        </p>
      )}
    </div>
  );
}

function ApprovalBlock() {
  return (
    <div>
      <BlockHeading icon={<PenLine className="h-3.5 w-3.5" />} title="Approval & Tanda Tangan" />
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Final Check
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHECKS.map((c) => (
              <ApprovalCheck key={c.code} code={c.code} label={c.label} />
            ))}
          </div>
        </div>
        <SignaturePadBound code="signature_mekanik" label="Mekanik — Final Check" />
      </div>
    </div>
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