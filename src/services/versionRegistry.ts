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
export type DeploymentType = "optional" | "recommended" | "force";

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
  deploymentType: DeploymentType;
  minSupportedVersion: string | null;
}

const FALLBACK: VersionRegistryInfo = {
  currentVersion: APP_VERSION,
  buildNumber: APP_BUILD_NUMBER,
  releaseDate: null,
  releaseBy: null,
  deploymentStatus: "draft",
  releaseChannel: "production",
  releaseNotes: null,
  deploymentType: "optional",
  minSupportedVersion: null,
};

/**
 * Fetch the latest published release; falls back to the most recent row
 * of any status, then to build-time constants when the table is empty.
 */
export async function getVersionRegistry(): Promise<VersionRegistryInfo> {
  try {
    const { data: published } = await supabase
      .from("app_releases")
      .select("version, build_number, released_at, released_by, status, release_channel, summary, changes, force_update, deployment_type")
      .eq("status", "published")
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const row =
      published ??
      (
        await supabase
          .from("app_releases")
          .select("version, build_number, released_at, released_by, status, release_channel, summary, changes, force_update, deployment_type")
          .order("released_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;

    if (!row) return FALLBACK;

    // Read min supported version from app_settings.
    let minSupportedVersion: string | null = null;
    try {
      const { data: minRow } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_min_version")
        .maybeSingle();
      const mv = (minRow?.value ?? null) as Record<string, unknown> | null;
      if (mv && typeof mv.version === "string") minSupportedVersion = mv.version;
    } catch { /* ignore */ }

    // Release notes: try app_settings.app_version.release_notes first,
    // fall back to app_releases.summary / .changes.
    let releaseNotes: string | null = null;
    try {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_version")
        .maybeSingle();
      const v = (setting?.value ?? null) as Record<string, unknown> | null;
      if (v && typeof v.release_notes === "string" && v.release_notes.trim()) {
        releaseNotes = v.release_notes as string;
      }
    } catch { /* ignore */ }
    if (!releaseNotes) {
      const summary = (row as { summary?: string | null }).summary;
      if (typeof summary === "string" && summary.trim()) {
        releaseNotes = summary;
      } else {
        const changes = (row as { changes?: unknown }).changes;
        if (Array.isArray(changes)) {
          const lines = changes
            .map((c) => (typeof c === "string" ? c : (c as { text?: string })?.text))
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0);
          if (lines.length > 0) releaseNotes = lines.join("\n");
        }
      }
    }

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
      releaseNotes,
      deploymentType: (() => {
        const t = ((row as { deployment_type?: string }).deployment_type ?? "").toLowerCase();
        if (t === "force" || t === "recommended" || t === "optional") return t as DeploymentType;
        return (row as { force_update?: boolean }).force_update ? "force" : "optional";
      })(),
      minSupportedVersion,
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