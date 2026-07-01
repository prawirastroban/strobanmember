import { useEffect, useState } from "react";
import { useVersionCheck } from "@/contexts/VersionCheckContext";
import { UpdateDialog } from "./UpdateDialog";

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

  return <UpdateDialog open={open} onOpenChange={setOpen} />;
};

export default UpdateDialogHost;