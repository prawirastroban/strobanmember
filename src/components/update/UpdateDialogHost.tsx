import { useCallback, useEffect, useState } from "react";
import { useVersionCheck } from "@/contexts/VersionCheckContext";
import { UpdateDialog } from "./UpdateDialog";
import { UpdateProgressOverlay } from "./UpdateProgressOverlay";
import { UpdateErrorDialog } from "./UpdateErrorDialog";
import { UpdateSuccessToast } from "./UpdateSuccessToast";
import { runSmartUpdate } from "@/services/updateProcess";

/**
 * Phase 3 — Update Dialog Host.
 *
 * Mounts once at the app root. Opens the dialog exactly once per app
 * session when an update is detected. Does not touch routing, session,
 * cache, or the Service Worker.
 */
export const UpdateDialogHost = () => {
  const {
    isUpdateAvailable,
    updateCheckStatus,
    updateDialogShown,
    localVersion,
    localBuild,
    serverVersion,
    serverBuild,
  } = useVersionCheck();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "updating" | "error">("idle");

  const startUpdate = useCallback(async () => {
    setPhase("updating");
    const outcome = await runSmartUpdate();
    if (outcome.status === "failed") {
      setPhase("error");
    } else if (outcome.status === "no_update") {
      setPhase("idle");
    }
    // On success: browser reload takes over; leave overlay visible until it happens.
  }, []);

  useEffect(() => {
    if (
      !open &&
      !updateDialogShown &&
      updateCheckStatus === "ok" &&
      isUpdateAvailable
    ) {
      setOpen(true);
      // eslint-disable-next-line no-console
      console.debug(
        `[UpdateDialog] displayed local=v${localVersion}(#${localBuild}) ` +
          `server=v${serverVersion ?? "?"}(#${serverBuild ?? "?"}) ` +
          `at=${new Date().toISOString()}`,
      );
    }
  }, [
    open,
    updateDialogShown,
    updateCheckStatus,
    isUpdateAvailable,
    localVersion,
    localBuild,
    serverVersion,
    serverBuild,
  ]);

  // Phase 5 — snackbar "Lihat" opens dialog even if already shown once.
  useEffect(() => {
    const handler = () => {
      if (isUpdateAvailable) {
        setOpen(true);
        // eslint-disable-next-line no-console
        console.info(
          `[VersionRealtime] dialog_displayed trigger=snackbar at=${new Date().toISOString()}`,
        );
      }
    };
    window.addEventListener("stroban:open-update-dialog", handler);
    return () =>
      window.removeEventListener("stroban:open-update-dialog", handler);
  }, [isUpdateAvailable]);

  return (
    <>
      <UpdateSuccessToast />
      <UpdateDialog open={open} onOpenChange={setOpen} onUpdate={startUpdate} />
      <UpdateProgressOverlay open={phase === "updating"} />
      <UpdateErrorDialog
        open={phase === "error"}
        onRetry={startUpdate}
        onClose={() => setPhase("idle")}
      />
    </>
  );
};

export default UpdateDialogHost;