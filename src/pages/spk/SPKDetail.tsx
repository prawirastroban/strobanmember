// Phase 5.3 — SPKDetail now renders the Digital SPK Canvas, which mirrors the
// paper Stroban Service Report structure while remaining mobile-first.
// The previous Phase 5.1 layout has been superseded by the canvas assembly.
import SPKCanvas from "./SPKCanvas";

export default function SPKDetail() {
  return <SPKCanvas />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static placeholder data — replaced later by runtime bindings.
const SPK_PLACEHOLDER = {
  number: "SPK-2026-000123",
  status: { label: "Sedang Dikerjakan", tone: "in_progress" as const },
  customer: "Budi Santoso",
  vehicle: "Toyota Avanza 1.3 G · 2020 · Hitam",
  plate: "B 1234 XYZ",
  progressPct: 55,
};

const TIMELINE_STEPS = [
  { key: "received", label: "Diterima", done: true },
  { key: "inspection", label: "Inspeksi", done: true },
  { key: "in_progress", label: "Pengerjaan", active: true },
  { key: "qc", label: "QC", done: false },
  { key: "done", label: "Selesai", done: false },
];

const CHECKLIST_PLACEHOLDER = [
  { code: "engine_oil", label: "Ganti oli mesin", state: "done" as const },
  { code: "oil_filter", label: "Ganti filter oli", state: "done" as const },
  { code: "brake_check", label: "Pemeriksaan rem", state: "todo" as const },
  { code: "tire_rotation", label: "Rotasi ban", state: "todo" as const },
];

// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ label }: { label: string }) {
  return (
    <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">
      {label}
    </Badge>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function TimelineStrip() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <ol className="flex min-w-max items-center gap-2">
        {TIMELINE_STEPS.map((s, i) => {
          const isLast = i === TIMELINE_STEPS.length - 1;
          const active = "active" in s && s.active;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                  s.done && "border-primary/40 bg-primary/10 text-primary",
                  active && "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)]",
                  !s.done && !active && "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {s.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                {s.label}
              </div>
              {!isLast && <span className="h-px w-4 bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChecklistPlaceholder() {
  return (
    <ul className="divide-y divide-border rounded-xl border bg-card">
      {CHECKLIST_PLACEHOLDER.map((f) => (
        <li key={f.code} className="flex items-center gap-3 px-4 py-3">
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
              f.state === "done"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/40",
            )}
          >
            {f.state === "done" && <CheckCircle2 className="h-4 w-4" />}
          </div>
          <span
            className={cn(
              "flex-1 text-sm",
              f.state === "done" ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {f.label}
          </span>
        </li>
      ))}
      <li className="px-4 py-3 text-xs text-muted-foreground">
        Area ini akan dirender oleh Dynamic Form Runtime (Phase 4.5) berdasarkan
        template SPK aktif.
      </li>
    </ul>
  );
}

function PhotoDropzone() {
  return (
    <button
      type="button"
      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/50 px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Camera className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-foreground">Tambah Foto</p>
      <p className="text-xs text-muted-foreground">
        Foto sebelum / sesudah pengerjaan. Bisa lebih dari satu.
      </p>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SPKDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(-1)}
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
              Surat Perintah Kerja
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {SPK_PLACEHOLDER.number}
              {id ? <span className="text-muted-foreground"> · {id}</span> : null}
            </p>
          </div>
          <StatusBadge label={SPK_PLACEHOLDER.status.label} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* SPK header card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Informasi SPK</CardTitle>
              <span className="text-xs text-muted-foreground">
                Progress {SPK_PLACEHOLDER.progressPct}%
              </span>
            </div>
            <Progress value={SPK_PLACEHOLDER.progressPct} className="h-2" />
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow icon={User2} label="Customer" value={SPK_PLACEHOLDER.customer} />
            <Separator />
            <InfoRow icon={Car} label="Kendaraan" value={SPK_PLACEHOLDER.vehicle} />
            <Separator />
            <InfoRow icon={Hash} label="Nomor Polisi" value={SPK_PLACEHOLDER.plate} />
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineStrip />
          </CardContent>
        </Card>

        {/* Dynamic Checklist */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Checklist Pekerjaan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ChecklistPlaceholder />
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Foto Pengerjaan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <PhotoDropzone />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Catatan Mekanik</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Tulis temuan, kondisi kendaraan, atau catatan pekerjaan di sini…"
              className="min-h-[120px] resize-y bg-background"
            />
          </CardContent>
        </Card>
      </main>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button variant="outline" className="h-12 flex-1 gap-2">
            <Save className="h-4 w-4" />
            Simpan
          </Button>
          <Button variant="outline" className="h-12 flex-1 gap-2">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
          <Button className="h-12 flex-[1.2] gap-2 bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90">
            <CheckCircle2 className="h-4 w-4" />
            Selesaikan
          </Button>
        </div>
      </div>
    </div>
  );
}
