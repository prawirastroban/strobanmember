// Finalisasi card — catatan mekanik + ringkasan waktu. Approval sudah
// diambil saat pembuatan SPK di /spk/new, jadi tidak ada lagi tanda tangan
// atau checklist approval di canvas.
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { PhotoDropzoneBound } from "./PhotoDropzoneBound";
import { ClipboardCheck, Clock, StickyNote, Timer, Wrench } from "lucide-react";
import { MechanicSelect, type MechanicValue } from "@/components/spk/common/MechanicSelect";
import { cn } from "@/lib/utils";
import {
  useBinding,
  useFormRuntimeSafe,
  useSectionBinding,
} from "@/hooks/spk/FormRuntimeProvider";

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
  const notes = useSectionBinding("notes");
  const time = useSectionBinding("time");
  if (!notes.visible && !time.visible) return null;

  return (
    <CanvasSection
      index={9}
      title="Finalisasi Pengerjaan"
      subtitle="Catatan mekanik & ringkasan waktu pengerjaan."
      role="mechanic"
      required
      forceOpen
      id="sec-notes"
    >
      <div className="space-y-5">
        <MechanicAssignmentBlock />
        {notes.visible && <NotesBlock />}
        {notes.visible && <FinalChecklistBlock />}
        {time.visible && <TimeBlock />}
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
  return <NotesBlockInner />;
}

function MechanicAssignmentBlock() {
  const [name, setName, nameMeta] = useBinding<string>("mechanic_name", "");
  const [mechId, setMechId] = useBinding<string>("mechanic_id", "");
  const [, setMechUserId] = useBinding<string>("mechanic_user_id", "");
  const rt = useFormRuntimeSafe();
  const branch = (rt?.values as Record<string, unknown> | undefined)?.branch_name;

  const value: MechanicValue = { id: mechId || null, name: name || "" };
  const handleChange = (next: MechanicValue) => {
    setMechId(next.id ?? "");
    setMechUserId(next.id ?? "");
    setName(next.name);
  };

  return (
    <div data-field="mechanic_name">
      <BlockHeading icon={<Wrench className="h-3.5 w-3.5" />} title="Dikerjakan Oleh" />
      <MechanicSelect
        value={value}
        onChange={handleChange}
        branch={typeof branch === "string" ? branch : null}
        disabled={nameMeta.disabled}
      />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Nama mekanik ini tampil di daftar SPK, ringkasan waktu, dan hasil PDF.
      </p>
    </div>
  );
}

function NotesBlockInner() {
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
        <PhotoDropzoneBound fieldKey="mechanic_photos" label="Foto Temuan Mekanik" max={8} />
      </div>
    </div>
  );
}

const FINAL_CHECK_ITEMS: { code: string; label: string }[] = [
  {
    code: "final_check_inspection",
    label: "Semua item Safety & General Check sudah dikerjakan",
  },
  {
    code: "final_check_estimasi",
    label: "Estimasi sparepart sudah dikonfirmasi ke customer",
  },
  {
    code: "final_check_kebersihan",
    label: "Kendaraan sudah dirapikan & dibersihkan",
  },
  {
    code: "final_check_ready",
    label: "Kendaraan siap diserahkan ke customer",
  },
];

function FinalChecklistBlock() {
  return (
    <div>
      <BlockHeading
        icon={<ClipboardCheck className="h-3.5 w-3.5" />}
        title="Konfirmasi Pemeriksaan Akhir"
      />
      <ul className="space-y-2">
        {FINAL_CHECK_ITEMS.map((item) => (
          <FinalCheckRow key={item.code} code={item.code} label={item.label} />
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Semua poin wajib dicentang sebelum menekan Selesaikan SPK.
      </p>
    </div>
  );
}

function FinalCheckRow({ code, label }: { code: string; label: string }) {
  const [val, setVal, meta] = useBinding<boolean>(code, false);
  if (!meta.visible) return null;
  return (
    <li data-field={code}>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border bg-white/5 px-3 py-2.5 backdrop-blur-md transition-colors",
          val
            ? "border-primary/40 bg-primary/5"
            : meta.error
              ? "border-primary/60"
              : "border-white/10 hover:bg-white/10",
          meta.disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Checkbox
          checked={!!val}
          onCheckedChange={(c) => setVal(c === true)}
          disabled={meta.disabled}
          className="mt-0.5"
        />
        <span className="text-sm leading-snug text-foreground">{label}</span>
      </label>
    </li>
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
