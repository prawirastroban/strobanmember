import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Phase 5 — Real-Time Update Manager.
 *
 * Subscribes to Postgres changes on `public.app_releases` and emits a
 * normalized `AppVersionEvent` whenever a release row is published. Never
 * polls: Supabase Realtime handles reconnect internally.
 */

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

export interface AppVersionEvent {
  version: string;
  build: number;
  releaseDate: string | null;
  deploymentId: string;
  releaseType: string;
  forceUpdate: boolean;
  releaseNotesSummary: string | null;
  releaseChannel: string | null;
  deploymentType: "optional" | "recommended" | "force";
}

type ReleaseRow = {
  id?: string;
  version?: string | null;
  build_number?: number | null;
  released_at?: string | null;
  status?: string | null;
  release_channel?: string | null;
  release_type?: string | null;
  summary?: string | null;
  force_update?: boolean | null;
  deployment_type?: string | null;
};

function toEvent(row: ReleaseRow | null | undefined): AppVersionEvent | null {
  if (!row || !row.version || row.status !== "published") return null;
  const rawType = (row.deployment_type ?? "").toLowerCase();
  const deploymentType: AppVersionEvent["deploymentType"] =
    rawType === "force" || rawType === "recommended" || rawType === "optional"
      ? (rawType as AppVersionEvent["deploymentType"])
      : row.force_update
        ? "force"
        : "optional";
  return {
    version: row.version,
    build: typeof row.build_number === "number" ? row.build_number : 0,
    releaseDate: row.released_at ?? null,
    deploymentId: row.id ?? "",
    releaseType: (row.release_type as string) ?? "standard",
    forceUpdate: deploymentType === "force",
    releaseNotesSummary:
      typeof row.summary === "string" && row.summary.trim().length > 0
        ? row.summary
        : null,
    releaseChannel: row.release_channel ?? null,
    deploymentType,
  };
}

export interface VersionRealtimeSubscription {
  unsubscribe: () => void;
}

export function subscribeAppVersionUpdates(
  onEvent: (event: AppVersionEvent) => void,
  onStatus: (status: RealtimeConnectionStatus) => void,
): VersionRealtimeSubscription {
  let hasConnectedOnce = false;
  let closed = false;

  const channel: RealtimeChannel = supabase
    .channel("app_version_updates")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "app_releases" },
      (payload) => {
        const event = toEvent(payload.new as ReleaseRow);
        if (event) onEvent(event);
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "app_releases" },
      (payload) => {
        const event = toEvent(payload.new as ReleaseRow);
        if (event) onEvent(event);
      },
    );

  onStatus("connecting");
  channel.subscribe((status) => {
    if (closed) return;
    // Supabase Realtime statuses: SUBSCRIBED | CLOSED | TIMED_OUT | CHANNEL_ERROR
    if (status === "SUBSCRIBED") {
      const next: RealtimeConnectionStatus = hasConnectedOnce
        ? "connected"
        : "connected";
      // eslint-disable-next-line no-console
      console.info(
        `[VersionRealtime] ${hasConnectedOnce ? "reconnected" : "connected"} at=${new Date().toISOString()}`,
      );
      hasConnectedOnce = true;
      onStatus(next);
    } else if (status === "CLOSED") {
      // eslint-disable-next-line no-console
      console.info(`[VersionRealtime] disconnected at=${new Date().toISOString()}`);
      onStatus("disconnected");
    } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
      // eslint-disable-next-line no-console
      console.info(
        `[VersionRealtime] reconnecting status=${status} at=${new Date().toISOString()}`,
      );
      onStatus("reconnecting");
    }
  });

  return {
    unsubscribe: () => {
      closed = true;
      void supabase.removeChannel(channel);
    },
  };
}