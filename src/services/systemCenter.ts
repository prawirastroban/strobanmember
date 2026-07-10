import { supabase } from "@/integrations/supabase/client";
import { getVersionRegistry, type VersionRegistryInfo } from "@/services/versionRegistry";

/**
 * System Management Center — read-only aggregate service.
 * Composes data from app_releases, app_version_clients, activity_logs,
 * admin_audit_log, and lightweight backend pings.
 */

export interface ApplicationStatus extends VersionRegistryInfo {
  previousVersion: string | null;
}

export interface ClientStatus {
  totalUsers: number;
  onlineUsers: number;
  usersUpdated: number;
  usersPending: number;
  usersFailed: number;
  adoptionPct: number;
}

export type ServiceState = "healthy" | "warning" | "offline";

export interface ServerStatus {
  api: ServiceState;
  database: ServiceState;
  storage: ServiceState;
  realtime: ServiceState;
  notification: ServiceState;
}

export interface RecentActivityItem {
  id: string;
  at: string;
  label: string;
  actor: string | null;
  kind: "release" | "audit" | "activity";
}

export type SummaryRange = "today" | "week" | "month";

export interface DeploymentSummary {
  range: SummaryRange;
  totalDeployments: number;
  totalReleases: number;
  successful: number;
  failed: number;
}

export interface VersionDistributionItem {
  version: string;
  users: number;
  pct: number;
}

const FIVE_MIN_AGO = () => new Date(Date.now() - 5 * 60_000).toISOString();

function startOf(range: SummaryRange): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "week") d.setDate(d.getDate() - 7);
  if (range === "month") d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

export async function fetchApplicationStatus(): Promise<ApplicationStatus> {
  const info = await getVersionRegistry();
  let previousVersion: string | null = null;
  try {
    const { data } = await supabase
      .from("app_releases")
      .select("previous_version")
      .eq("version", info.currentVersion)
      .maybeSingle();
    previousVersion = (data as { previous_version?: string | null } | null)?.previous_version ?? null;
  } catch {
    /* ignore */
  }
  return { ...info, previousVersion };
}

export async function fetchClientStatus(currentVersion: string): Promise<ClientStatus> {
  const [{ count: total }, { count: online }, { data: rows }] = await Promise.all([
    supabase.from("app_version_clients").select("id", { count: "exact", head: true }),
    supabase
      .from("app_version_clients")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", FIVE_MIN_AGO()),
    supabase.from("app_version_clients").select("current_version, update_status"),
  ]);

  const list = (rows ?? []) as { current_version: string | null; update_status: string | null }[];
  const updated = list.filter((r) => (r.current_version ?? "") === currentVersion).length;
  const failed = list.filter((r) => (r.update_status ?? "") === "failed").length;
  const pending = Math.max(0, (list.length || 0) - updated - failed);
  const adoptionPct = list.length > 0 ? Math.round((updated / list.length) * 100) : 0;

  return {
    totalUsers: total ?? list.length,
    onlineUsers: online ?? 0,
    usersUpdated: updated,
    usersPending: pending,
    usersFailed: failed,
    adoptionPct,
  };
}

export async function fetchServerStatus(): Promise<ServerStatus> {
  const status: ServerStatus = {
    api: "offline",
    database: "offline",
    storage: "offline",
    realtime: "offline",
    notification: "offline",
  };

  // DB + API (single ping)
  try {
    const t0 = performance.now();
    const { error } = await supabase.from("app_settings").select("key").limit(1);
    const dt = performance.now() - t0;
    if (!error) {
      status.api = dt < 1500 ? "healthy" : "warning";
      status.database = dt < 1500 ? "healthy" : "warning";
    }
  } catch {
    /* offline */
  }

  // Storage
  try {
    const { error } = await supabase.storage.listBuckets();
    status.storage = error ? "warning" : "healthy";
  } catch {
    status.storage = "offline";
  }

  // Realtime (subscribe briefly)
  try {
    const state = await new Promise<ServiceState>((resolve) => {
      const ch = supabase.channel(`sysc-health-${Date.now()}`);
      let settled = false;
      const finish = (next: ServiceState) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(next);
        window.setTimeout(() => {
          supabase.removeChannel(ch).catch(() => undefined);
        }, 0);
      };
      const timer = setTimeout(() => {
        finish("warning");
      }, 2500);
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          finish("healthy");
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          finish("offline");
        }
      });
    });
    status.realtime = state;
  } catch {
    status.realtime = "offline";
  }

  // Notification: any push tokens registered?
  try {
    const { count, error } = await supabase
      .from("push_tokens")
      .select("id", { count: "exact", head: true });
    if (!error) status.notification = (count ?? 0) > 0 ? "healthy" : "warning";
  } catch {
    status.notification = "offline";
  }

  return status;
}

export async function fetchDeploymentSummary(range: SummaryRange): Promise<DeploymentSummary> {
  const since = startOf(range);
  const { data } = await supabase
    .from("app_releases")
    .select("status")
    .gte("created_at", since);
  const rows = (data ?? []) as { status: string | null }[];
  const successful = rows.filter((r) => r.status === "published").length;
  const failed = rows.filter((r) => r.status === "archived").length;
  return {
    range,
    totalDeployments: rows.length,
    totalReleases: successful,
    successful,
    failed,
  };
}

export async function fetchVersionDistribution(): Promise<VersionDistributionItem[]> {
  const { data } = await supabase
    .from("app_version_clients")
    .select("current_version");
  const rows = (data ?? []) as { current_version: string | null }[];
  const total = rows.length;
  if (total === 0) return [];
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const v = r.current_version || "unknown";
    map.set(v, (map.get(v) || 0) + 1);
  });
  const items = [...map.entries()]
    .map(([version, users]) => ({ version, users, pct: Math.round((users / total) * 100) }))
    .sort((a, b) => b.users - a.users);
  if (items.length <= 3) return items;
  const top = items.slice(0, 3);
  const older = items.slice(3).reduce((s, i) => s + i.users, 0);
  top.push({
    version: "Older",
    users: older,
    pct: Math.round((older / total) * 100),
  });
  return top;
}

export async function fetchRecentSystemActivity(limit = 10): Promise<RecentActivityItem[]> {
  const [releases, audits] = await Promise.all([
    supabase
      .from("app_releases")
      .select("id, version, status, updated_at, title")
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("admin_audit_log")
      .select("id, action, target_label, actor_role, created_at")
      .in("action", [
        "release.publish",
        "release.draft",
        "release.archive",
        "release_notes.update",
        "cache.rebuild",
        "maintenance.enable",
        "maintenance.disable",
        "deployment.finish",
      ])
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: RecentActivityItem[] = [];
  (releases.data ?? []).forEach((r: any) => {
    items.push({
      id: `rel-${r.id}`,
      at: r.updated_at,
      label: `Version ${r.version} ${r.status === "published" ? "Published" : r.status === "archived" ? "Archived" : "Draft"}`,
      actor: null,
      kind: "release",
    });
  });
  (audits.data ?? []).forEach((a: any) => {
    const map: Record<string, string> = {
      "release.publish": "Version Published",
      "release.draft": "Draft Saved",
      "release.archive": "Version Archived",
      "release_notes.update": "Release Notes Generated",
      "cache.rebuild": "Cache Rebuilt",
      "maintenance.enable": "Maintenance Enabled",
      "maintenance.disable": "Maintenance Disabled",
      "deployment.finish": "Deployment Finished",
    };
    items.push({
      id: `aud-${a.id}`,
      at: a.created_at,
      label: `${map[a.action] || a.action}${a.target_label ? ` — ${a.target_label}` : ""}`,
      actor: a.actor_role,
      kind: "audit",
    });
  });

  return items
    .filter((i) => Boolean(i.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}