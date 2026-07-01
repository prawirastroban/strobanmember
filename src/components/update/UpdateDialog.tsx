import { ArrowUpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVersionCheck } from "@/contexts/VersionCheckContext";
import { formatReleaseDate } from "@/services/versionRegistry";

/**
 * Phase 3 — Update Dialog (informational only).
 *
 * Displays version info + release notes when a newer app version is
 * available. The buttons do NOT trigger any actual update, refresh, or
 * cache clear — those belong to Phase 4.
 */

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseReleaseNotes(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s?/, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, 5);
}

const InfoCell = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
  </div>
);

export const UpdateDialog = ({ open, onOpenChange }: UpdateDialogProps) => {
  const {
    localVersion,
    serverVersion,
    localBuild,
    serverBuild,
    releaseNotes,
    releaseDate,
    releaseChannel,
    markUpdateDialogShown,
    recordUpdateChoice,
  } = useVersionCheck();

  const notes = parseReleaseNotes(releaseNotes);
  const displayNotes = notes.length > 0 ? notes : ["Perbaikan performa dan peningkatan stabilitas."];

  const handleUpdate = () => {
    recordUpdateChoice("update");
    markUpdateDialogShown();
    onOpenChange(false);
    // Phase 4 hook — no actual update, refresh, or cache clear yet.
  };

  const handleLater = () => {
    recordUpdateChoice("later");
    markUpdateDialogShown();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleLater())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "rgba(255,43,43,0.12)", color: "#ff2b2b" }}
            >
              <ArrowUpCircle className="h-6 w-6" aria-hidden />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">Aplikasi telah diperbarui</DialogTitle>
              <DialogDescription>Versi terbaru telah tersedia.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <InfoCell label="Current Version" value={`v${localVersion}`} />
          <InfoCell
            label="Latest Version"
            value={serverVersion ? `v${serverVersion}` : "—"}
          />
          <InfoCell label="Current Build" value={`#${localBuild}`} />
          <InfoCell
            label="Latest Build"
            value={typeof serverBuild === "number" ? `#${serverBuild}` : "—"}
          />
          <InfoCell label="Release Date" value={formatReleaseDate(releaseDate)} />
          <InfoCell
            label="Release Channel"
            value={
              <Badge variant="secondary" className="text-[11px] capitalize">
                {releaseChannel ?? "production"}
              </Badge>
            }
          />
        </div>

        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perubahan
          </div>
          <ul className="space-y-1 text-sm text-foreground">
            {displayNotes.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#ff2b2b" }} />
                <span className="leading-snug">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleLater}>
            Nanti
          </Button>
          <Button
            onClick={handleUpdate}
            style={{ background: "#ff2b2b", color: "white" }}
          >
            Update Sekarang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateDialog;