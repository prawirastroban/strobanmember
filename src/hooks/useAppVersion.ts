import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION, compareVersion } from "@/lib/appVersion";

export interface ServerVersionInfo {
  version: string;
  released_at?: string | null;
  release_notes?: string;
  force_refresh?: boolean;
}

export interface AppVersionState {
  current: string;
  latest: string | null;
  minVersion: string | null;
  releaseNotes: string;
  forceRefresh: boolean;
  mismatch: boolean;
  blocking: boolean;
  loading: boolean;
}

const POLL_INTERVAL_MS = 60_000;

export function useAppVersion(): AppVersionState {
  const [latest, setLatest] = useState<string | null>(null);
  const [minVersion, setMinVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string>("");
  const [forceRefresh, setForceRefresh] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchVersion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["app_version", "app_min_version"]);
      if (error || !data) return;
      for (const row of data) {
        const val = row.value as Record<string, unknown> | null;
        if (!val) continue;
        if (row.key === "app_version") {
          if (typeof val.version === "string") setLatest(val.version);
          if (typeof val.release_notes === "string")
            setReleaseNotes(val.release_notes);
          setForceRefresh(Boolean(val.force_refresh));
        } else if (row.key === "app_min_version") {
          if (typeof val.version === "string") setMinVersion(val.version);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVersion();
    const id = window.setInterval(fetchVersion, POLL_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void fetchVersion();
    };
    const onOnline = () => void fetchVersion();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);

    const channel = supabase
      .channel("app_version_watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          const key = (payload.new as { key?: string } | null)?.key;
          if (key === "app_version" || key === "app_min_version") {
            void fetchVersion();
          }
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      void supabase.removeChannel(channel);
    };
  }, [fetchVersion]);

  const mismatch =
    !!latest && compareVersion(APP_VERSION, latest) < 0;
  const belowMin =
    !!minVersion && compareVersion(APP_VERSION, minVersion) < 0;
  const blocking = (mismatch && forceRefresh) || belowMin;

  return {
    current: APP_VERSION,
    latest,
    minVersion,
    releaseNotes,
    forceRefresh,
    mismatch,
    blocking,
    loading,
  };
}