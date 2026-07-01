import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION, APP_BUILD_NUMBER } from "@/lib/appVersion";

/**
 * Version Registry — Phase 1 foundation for the Update Manager.
 *
 * Read-only service that exposes a single, unified view of "what version
 * of the app is currently released". Consumers (future Update Manager
 * phases: compare, force-update, popup, cache manager, etc.) should read
 * from here so we only touch one place when the source of truth evolves.
 *
 * Does not mutate anything. Does not touch the Service Worker, routing,
 * or authentication.
 */

export type DeploymentStatus = "draft" | "published" | "archived";
export type ReleaseChannel = "production" | "beta";

export interface ReleaseAuthor {
  id: string;
  name: string | null;
  phone: string | null;
}

export interface VersionRegistryInfo {
  currentVersion: string;
  buildNumber: number;
  releaseDate: string | null;
  releaseBy: ReleaseAuthor | null;
  deploymentStatus: DeploymentStatus;
  releaseChannel: ReleaseChannel;
  releaseNotes: string | null;
}

const FALLBACK: VersionRegistryInfo = {
  currentVersion: APP_VERSION,
  buildNumber: APP_BUILD_NUMBER,
  releaseDate: null,
  releaseBy: null,
  deploymentStatus: "draft",
  releaseChannel: "production",
  releaseNotes: null,
};

/**
 * Fetch the latest published release; falls back to the most recent row
 * of any status, then to build-time constants when the table is empty.
 */
export async function getVersionRegistry(): Promise<VersionRegistryInfo> {
  try {
    const { data: published } = await supabase
      .from("app_releases")
      .select("version, build_number, released_at, released_by, status, release_channel, release_notes")
      .eq("status", "published")
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const row =
      published ??
      (
        await supabase
          .from("app_releases")
          .select("version, build_number, released_at, released_by, status, release_channel, release_notes")
          .order("released_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;

    if (!row) return FALLBACK;

    let releaseBy: ReleaseAuthor | null = null;
    if (row.released_by) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", row.released_by)
        .maybeSingle();
      if (prof) {
        releaseBy = {
          id: prof.id as string,
          name: (prof as { full_name?: string | null }).full_name ?? null,
          phone: (prof as { phone?: string | null }).phone ?? null,
        };
      } else {
        releaseBy = { id: row.released_by as string, name: null, phone: null };
      }
    }

    return {
      currentVersion: (row.version as string) ?? APP_VERSION,
      buildNumber:
        typeof row.build_number === "number" && row.build_number > 0
          ? row.build_number
          : APP_BUILD_NUMBER,
      releaseDate: (row.released_at as string) ?? null,
      releaseBy,
      deploymentStatus: ((row.status as DeploymentStatus) ?? "draft"),
      releaseChannel: ((row.release_channel as ReleaseChannel) ?? "production"),
      releaseNotes:
        typeof (row as { release_notes?: string | null }).release_notes === "string"
          ? ((row as { release_notes?: string | null }).release_notes as string)
          : null,
    };
  } catch {
    return FALLBACK;
  }
}

export function useVersionRegistry() {
  const [info, setInfo] = useState<VersionRegistryInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getVersionRegistry();
    setInfo(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel("version_registry_watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_releases" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { info, loading, refresh };
}

export function formatReleaseDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}