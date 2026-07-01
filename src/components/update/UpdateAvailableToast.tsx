import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useVersionCheck } from "@/contexts/VersionCheckContext";

/**
 * Phase 5 — Snackbar for realtime "new version available" events.
 * 5s duration; "Lihat" opens the Phase 3 dialog. No reload, no nav.
 */
export const UpdateAvailableToast = () => {
  const {
    isUpdateAvailable,
    updateDialogShown,
    serverVersion,
    serverBuild,
    lastVersionEvent,
  } = useVersionCheck();

  const lastToastedDeploymentRef = useRef<string | null>(null);
  const lastToastedBuildRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isUpdateAvailable || updateDialogShown) return;

    const deploymentId = lastVersionEvent?.deploymentId ?? null;
    const build = serverBuild ?? lastVersionEvent?.build ?? null;

    if (deploymentId && lastToastedDeploymentRef.current === deploymentId) return;
    if (!deploymentId && build && lastToastedBuildRef.current === build) return;

    lastToastedDeploymentRef.current = deploymentId;
    lastToastedBuildRef.current = build;

    const version = serverVersion ?? lastVersionEvent?.version ?? "?";
    // eslint-disable-next-line no-console
    console.info(
      `[VersionRealtime] notification_displayed v${version}(#${build ?? "?"}) at=${new Date().toISOString()}`,
    );

    toast("Versi terbaru tersedia", {
      description: `v${version} · Build ${build ?? "—"}`,
      duration: 5000,
      action: {
        label: "Lihat",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("stroban:open-update-dialog"));
        },
      },
    });
  }, [
    isUpdateAvailable,
    updateDialogShown,
    serverVersion,
    serverBuild,
    lastVersionEvent,
  ]);

  return null;
};

export default UpdateAvailableToast;