import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchApplicationStatus,
  fetchClientStatus,
  fetchServerStatus,
  fetchDeploymentSummary,
  fetchVersionDistribution,
  fetchRecentSystemActivity,
  type ApplicationStatus,
  type ClientStatus,
  type ServerStatus,
  type DeploymentSummary,
  type VersionDistributionItem,
  type RecentActivityItem,
  type SummaryRange,
} from "@/services/systemCenter";

export interface SystemCenterState {
  app: ApplicationStatus | null;
  clients: ClientStatus | null;
  server: ServerStatus | null;
  summary: DeploymentSummary | null;
  distribution: VersionDistributionItem[];
  activity: RecentActivityItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  summaryRange: SummaryRange;
  setSummaryRange: (r: SummaryRange) => void;
  refresh: () => Promise<void>;
}

export function useSystemCenter(): SystemCenterState {
  const [app, setApp] = useState<ApplicationStatus | null>(null);
  const [clients, setClients] = useState<ClientStatus | null>(null);
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [summary, setSummary] = useState<DeploymentSummary | null>(null);
  const [distribution, setDistribution] = useState<VersionDistributionItem[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debounceRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [a, s, sum, dist, act] = await Promise.all([
        fetchApplicationStatus(),
        fetchServerStatus(),
        fetchDeploymentSummary(summaryRange),
        fetchVersionDistribution(),
        fetchRecentSystemActivity(10),
      ]);
      setApp(a);
      setServer(s);
      setSummary(sum);
      setDistribution(dist);
      setActivity(act);
      const c = await fetchClientStatus(a.currentVersion);
      setClients(c);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data system center");
    } finally {
      setLoading(false);
    }
  }, [summaryRange]);

  useEffect(() => {
    void refresh();

    const schedule = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => void refresh(), 1500);
    };

    const channel = supabase
      .channel("system-center-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_releases" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_version_clients" }, schedule)
      .subscribe();

    const interval = window.setInterval(() => void refresh(), 30_000);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      window.clearInterval(interval);
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [refresh]);

  return {
    app, clients, server, summary, distribution, activity,
    loading, error, lastUpdated,
    summaryRange, setSummaryRange, refresh,
  };
}