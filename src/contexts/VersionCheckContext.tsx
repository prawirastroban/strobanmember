import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { APP_VERSION, APP_BUILD_NUMBER } from "@/lib/appVersion";
import {
  runVersionCheck,
  type VersionCheckStatus,
} from "@/services/versionCheck";

/**
 * Version Check Context — Phase 2.
 *
 * Global state store for "is a newer app version available?". Runs a
 * check on mount and whenever the app resumes from background. Never
 * renders UI, never mutates routes, never touches the Service Worker.
 * Phase 3+ consumers read from `useVersionCheck()`.
 */

export interface VersionCheckState {
  isUpdateAvailable: boolean;
  localVersion: string;
  serverVersion: string | null;
  localBuild: number;
  serverBuild: number | null;
  lastVersionCheck: string | null;
  updateCheckStatus: VersionCheckStatus;
  checkNow: () => Promise<void>;
}

const DEFAULT_STATE: VersionCheckState = {
  isUpdateAvailable: false,
  localVersion: APP_VERSION,
  serverVersion: null,
  localBuild: APP_BUILD_NUMBER,
  serverBuild: null,
  lastVersionCheck: null,
  updateCheckStatus: "idle",
  checkNow: async () => {},
};

const VersionCheckContext = createContext<VersionCheckState>(DEFAULT_STATE);

export const VersionCheckProvider = ({ children }: { children: ReactNode }) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverBuild, setServerBuild] = useState<number | null>(null);
  const [lastVersionCheck, setLastVersionCheck] = useState<string | null>(null);
  const [updateCheckStatus, setUpdateCheckStatus] =
    useState<VersionCheckStatus>("idle");
  const inFlight = useRef(false);

  const checkNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setUpdateCheckStatus("checking");
    try {
      const result = await runVersionCheck();
      setServerVersion(result.serverVersion);
      setServerBuild(result.serverBuild);
      setIsUpdateAvailable(result.isUpdateAvailable);
      setLastVersionCheck(result.checkedAt);
      setUpdateCheckStatus(result.status);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial check on app open.
    void checkNow();

    // Resume from background (web).
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkNow();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Resume from background (native / Capacitor).
    let removeNativeListener: (() => void) | null = null;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const sub = await App.addListener("appStateChange", (state) => {
          if (state.isActive) void checkNow();
        });
        removeNativeListener = () => {
          void sub.remove();
        };
      } catch {
        /* not in a Capacitor context — ignore */
      }
    })();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      removeNativeListener?.();
    };
  }, [checkNow]);

  return (
    <VersionCheckContext.Provider
      value={{
        isUpdateAvailable,
        localVersion: APP_VERSION,
        serverVersion,
        localBuild: APP_BUILD_NUMBER,
        serverBuild,
        lastVersionCheck,
        updateCheckStatus,
        checkNow,
      }}
    >
      {children}
    </VersionCheckContext.Provider>
  );
};

export function useVersionCheck(): VersionCheckState {
  return useContext(VersionCheckContext);
}