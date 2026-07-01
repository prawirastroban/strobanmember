import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useVersionCheck } from "@/contexts/VersionCheckContext";

/**
 * Phase 6 — Version Enforcement Gate.
 *
 * When the client is below the server-declared minimum version (or the
 * latest publish is a Force deployment) and the update has not completed
 * yet, block rendering of protected routes. Public routes stay available
 * so users are never fully stuck; the ForceUpdateDialog still overlays.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/booking",
  "/crm",
  "/inventory",
  "/report",
  "/pos",
  "/settings",
  "/checkout",
  "/admin",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

interface VersionEnforcementGateProps {
  children: ReactNode;
}

export const VersionEnforcementGate = ({
  children,
}: VersionEnforcementGateProps) => {
  const location = useLocation();
  const { isForceMode, isBelowMinimum, updatePhase } = useVersionCheck();

  const shouldBlock =
    (isForceMode || isBelowMinimum) &&
    updatePhase !== "success" &&
    isProtectedPath(location.pathname);

  if (shouldBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center bg-background">
        <div className="max-w-md">
          <div className="text-lg font-semibold mb-2">Aplikasi harus diperbarui</div>
          <p className="text-sm text-muted-foreground">
            Versi yang Anda gunakan sudah tidak didukung. Silakan perbarui
            aplikasi untuk melanjutkan.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default VersionEnforcementGate;