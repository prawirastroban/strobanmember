import { useCallback, useEffect, useRef, useState } from "react";
import { useVersionCheck } from "@/contexts/VersionCheckContext";
import { UpdateDialog } from "./UpdateDialog";
import { UpdateProgressOverlay } from "./UpdateProgressOverlay";
import { UpdateErrorDialog } from "./UpdateErrorDialog";
import { UpdateSuccessToast } from "./UpdateSuccessToast";
import { ForceUpdateDialog } from "./ForceUpdateDialog";
import { PendingWorkPrompt } from "./PendingWorkPrompt";
import {
  hasPendingWork,
  runSmartUpdateWithRetry,
} from "@/services/updateProcess";

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
    deploymentType,
    isForceMode,
    isBelowMinimum,
    setUpdatePhase,
    reportUpdateAttempt,
    retryCount,
    cancelCountdown,
  } = useVersionCheck();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "updating" | "error">("idle");
  const [pendingPromptOpen, setPendingPromptOpen] = useState(false);
  const pendingResolverRef = useRef<((go: boolean) => void) | null>(null);

  const isForceDeployment =
    isForceMode || isBelowMinimum || deploymentType === "force";

  const askPendingWork = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!hasPendingWork()) {
        resolve(true);
        return;
      }
      pendingResolverRef.current = resolve;
      setPendingPromptOpen(true);
      if (isForceDeployment) {
        // Force mode: allow 15s override then auto-continue.
        window.setTimeout(() => {
          if (pendingResolverRef.current) {
            pendingResolverRef.current(true);
            pendingResolverRef.current = null;
            setPendingPromptOpen(false);
          }
        }, 15000);
      }
    });
  }, [isForceDeployment]);

  const startUpdate = useCallback(async () => {
    const proceed = await askPendingWork();
    if (!proceed) return;
    setPhase("updating");
    setUpdatePhase("running");
    const outcome = await runSmartUpdateWithRetry({
      retries: 3,
      onAttempt: (attempt, res) => {
        reportUpdateAttempt(
          attempt,
          res.status === "failed" ? String(res.error ?? "unknown") : null,
        );
      },
    });
    if (outcome.status === "failed") {
      setPhase("error");
      setUpdatePhase("failed");
    } else if (outcome.status === "no_update") {
      setPhase("idle");
      setUpdatePhase("success");
    } else {
      setUpdatePhase("success");
    }
  }, [askPendingWork, reportUpdateAttempt, setUpdatePhase]);

  useEffect(() => {
    // Optional deployment: never open the modal automatically — snackbar only.
    if (deploymentType === "optional" && !isForceDeployment) return;
    if (
      !open &&
      !updateDialogShown &&
      updateCheckStatus === "ok" &&
      isUpdateAvailable
    ) {
      setOpen(true);
      // eslint-disable-next-line no-console
      console.debug(
        `[UpdateDialog] displayed type=${deploymentType} local=v${localVersion}(#${localBuild}) ` +
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
    deploymentType,
    isForceDeployment,
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

  const showForce = isForceDeployment && isUpdateAvailable;

  return (
    <>
      <UpdateSuccessToast />
      {!showForce && (
        <UpdateDialog
          open={open}
          onOpenChange={setOpen}
          onUpdate={startUpdate}
        />
      )}
      <ForceUpdateDialog
        open={showForce && phase !== "error"}
        updating={phase === "updating"}
        onStart={() => {
          cancelCountdown();
          void startUpdate();
        }}
      />
      <PendingWorkPrompt
        open={pendingPromptOpen}
        isForce={isForceDeployment}
        onSaveAndUpdate={() => {
          // Dispatch a save signal so open forms can flush drafts.
          window.dispatchEvent(new CustomEvent("stroban:flush-drafts"));
          setPendingPromptOpen(false);
          pendingResolverRef.current?.(true);
          pendingResolverRef.current = null;
        }}
        onUpdateNow={() => {
          setPendingPromptOpen(false);
          pendingResolverRef.current?.(true);
          pendingResolverRef.current = null;
        }}
        onCancel={() => {
          setPendingPromptOpen(false);
          pendingResolverRef.current?.(false);
          pendingResolverRef.current = null;
        }}
      />
      <UpdateProgressOverlay open={phase === "updating"} />
      <UpdateErrorDialog
        open={phase === "error"}
        onRetry={startUpdate}
        onClose={() => setPhase("idle")}
        retryCount={retryCount}
        isForce={isForceDeployment}
      />
    </>
  );
};

export default UpdateDialogHost;