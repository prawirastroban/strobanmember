import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { APP_VERSION, APP_BUILD_NUMBER, compareVersion } from "@/lib/appVersion";
import {
  runVersionCheck,
  type VersionCheckStatus,
} from "@/services/versionCheck";
import type { ReleaseChannel, DeploymentType } from "@/services/versionRegistry";
import {
  subscribeAppVersionUpdates,
  type AppVersionEvent,
  type RealtimeConnectionStatus,
} from "@/services/versionRealtime";

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
  releaseNotes: string | null;
  releaseDate: string | null;
  releaseChannel: ReleaseChannel | null;
  updateDialogShown: boolean;
  markUpdateDialogShown: () => void;
  recordUpdateChoice: (choice: "update" | "later") => void;
  // Phase 5 — realtime monitoring surface.
  realtimeConnected: boolean;
  connectionStatus: RealtimeConnectionStatus;
  lastEventAt: string | null;
  lastVersionEvent: AppVersionEvent | null;
  reconnectCount: number;
  // Phase 6 — enterprise force-update surface.
  deploymentType: DeploymentType;
  minSupportedVersion: string | null;
  isBelowMinimum: boolean;
  isForceMode: boolean;
  updatePhase: "idle" | "pending" | "running" | "success" | "failed";
  retryCount: number;
  lastUpdateError: string | null;
  countdownActive: boolean;
  countdownRemaining: number;
  setUpdatePhase: (p: "idle" | "pending" | "running" | "success" | "failed") => void;
  reportUpdateAttempt: (attempt: number, error?: string | null) => void;
  startCountdown: (seconds?: number) => void;
  cancelCountdown: () => void;
  markForceMode: (reason: string) => void;
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
  releaseNotes: null,
  releaseDate: null,
  releaseChannel: null,
  updateDialogShown: false,
  markUpdateDialogShown: () => {},
  recordUpdateChoice: () => {},
  realtimeConnected: false,
  connectionStatus: "idle",
  lastEventAt: null,
  lastVersionEvent: null,
  reconnectCount: 0,
  deploymentType: "optional",
  minSupportedVersion: null,
  isBelowMinimum: false,
  isForceMode: false,
  updatePhase: "idle",
  retryCount: 0,
  lastUpdateError: null,
  countdownActive: false,
  countdownRemaining: 0,
  setUpdatePhase: () => {},
  reportUpdateAttempt: () => {},
  startCountdown: () => {},
  cancelCountdown: () => {},
  markForceMode: () => {},
};

const VersionCheckContext = createContext<VersionCheckState>(DEFAULT_STATE);

export const VersionCheckProvider = ({ children }: { children: ReactNode }) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverBuild, setServerBuild] = useState<number | null>(null);
  const [lastVersionCheck, setLastVersionCheck] = useState<string | null>(null);
  const [updateCheckStatus, setUpdateCheckStatus] =
    useState<VersionCheckStatus>("idle");
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<string | null>(null);
  const [releaseChannel, setReleaseChannel] = useState<ReleaseChannel | null>(null);
  const [updateDialogShown, setUpdateDialogShown] = useState(false);
  const inFlight = useRef(false);
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeConnectionStatus>("idle");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [lastVersionEvent, setLastVersionEvent] =
    useState<AppVersionEvent | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const prevConnectionRef = useRef<RealtimeConnectionStatus>("idle");
  const highestServerBuildRef = useRef<number>(0);

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
      setReleaseNotes(result.releaseNotes);
      setReleaseDate(result.releaseDate);
      setReleaseChannel(result.releaseChannel);
      if (
        typeof result.serverBuild === "number" &&
        result.serverBuild > highestServerBuildRef.current
      ) {
        highestServerBuildRef.current = result.serverBuild;
      }
    } finally {
      inFlight.current = false;
    }
  }, []);

  const markUpdateDialogShown = useCallback(() => {
    setUpdateDialogShown(true);
  }, []);

  const recordUpdateChoice = useCallback(
    (choice: "update" | "later") => {
      // eslint-disable-next-line no-console
      console.debug(
        `[UpdateDialog] user_choice=${choice} ` +
          `local=v${APP_VERSION}(#${APP_BUILD_NUMBER}) ` +
          `server=v${serverVersion ?? "?"}(#${serverBuild ?? "?"}) ` +
          `at=${new Date().toISOString()}`,
      );
    },
    [serverVersion, serverBuild],
  );

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

  // Phase 5 — Realtime subscription. Independent lifecycle from checkNow.
  useEffect(() => {
    const sub = subscribeAppVersionUpdates(
      (event) => {
        const now = new Date().toISOString();
        setLastEventAt(now);
        setLastVersionEvent(event);
        // eslint-disable-next-line no-console
        console.info(
          `[VersionRealtime] event_received deployment=${event.deploymentId} ` +
            `v${event.version}(#${event.build}) at=${now}`,
        );
        const isNewer =
          event.build > APP_BUILD_NUMBER &&
          event.build > highestServerBuildRef.current;
        if (isNewer) {
          highestServerBuildRef.current = event.build;
          setServerVersion(event.version);
          setServerBuild(event.build);
          setReleaseNotes(event.releaseNotesSummary);
          setReleaseDate(event.releaseDate);
          setReleaseChannel(
            (event.releaseChannel as ReleaseChannel | null) ?? null,
          );
          setIsUpdateAvailable(true);
          setUpdateCheckStatus("ok");
          setUpdateDialogShown(false); // allow dialog to appear again for a newer build
          // eslint-disable-next-line no-console
          console.info(
            `[VersionRealtime] version_changed local=#${APP_BUILD_NUMBER} ` +
              `server=#${event.build} at=${now}`,
          );
        }
      },
      (status) => {
        setConnectionStatus(status);
        const prev = prevConnectionRef.current;
        prevConnectionRef.current = status;
        if (prev !== "connected" && status === "connected" && prev !== "idle" && prev !== "connecting") {
          setReconnectCount((n) => n + 1);
          // reconcile any missed events while offline
          void checkNow();
        }
      },
    );
    return () => sub.unsubscribe();
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
        releaseNotes,
        releaseDate,
        releaseChannel,
        updateDialogShown,
        markUpdateDialogShown,
        recordUpdateChoice,
        realtimeConnected: connectionStatus === "connected",
        connectionStatus,
        lastEventAt,
        lastVersionEvent,
        reconnectCount,
      }}
    >
      {children}
    </VersionCheckContext.Provider>
  );
};

export function useVersionCheck(): VersionCheckState {
  return useContext(VersionCheckContext);
}