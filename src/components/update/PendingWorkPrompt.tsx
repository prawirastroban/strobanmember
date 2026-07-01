import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Phase 6 — Pending work prompt shown before reload when the user has
 * unsaved forms or in-flight uploads. For Force deployments the Cancel
 * button is hidden.
 */
interface PendingWorkPromptProps {
  open: boolean;
  isForce: boolean;
  onSaveAndUpdate: () => void;
  onUpdateNow: () => void;
  onCancel: () => void;
}

export const PendingWorkPrompt = ({
  open,
  isForce,
  onSaveAndUpdate,
  onUpdateNow,
  onCancel,
}: PendingWorkPromptProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ada pekerjaan yang belum selesai</AlertDialogTitle>
          <AlertDialogDescription>
            Beberapa formulir atau unggahan sedang berjalan. Apa yang ingin Anda
            lakukan sebelum aplikasi diperbarui?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {!isForce && (
            <AlertDialogCancel onClick={onCancel}>Batalkan</AlertDialogCancel>
          )}
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            onClick={onSaveAndUpdate}
          >
            Simpan &amp; Update
          </button>
          <AlertDialogAction
            onClick={onUpdateNow}
            style={{ background: "#ff2b2b", color: "white" }}
          >
            Update Sekarang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PendingWorkPrompt;