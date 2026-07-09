// Phase 5.7 — Operational Configuration Service
//
// Metadata-driven business rules for the SPK domain. Reads/writes JSONB
// records from the existing `app_settings` table (Operational Configuration
// Layer) and hydrates the Runtime caches. No new tables, no schema changes.
//
// Keys owned by this service (namespace `spk.*`):
//   - spk.role_profiles     → Record<SpkActor, { visible, editable }>
//   - spk.workflow          → reserved (Phase 5.8)
//   - spk.approval_matrix   → reserved
//   - spk.numbering         → reserved
//   - spk.automation        → reserved
//
// Contract:
//   load()  — fetches all known SPK config rows, pushes them into Runtime
//             caches, caches the raw payload in-memory. Safe to call many
//             times; second call within TTL returns cached copy.
//   invalidate() — clears the in-memory cache so the next load() re-reads.
//
// Failure mode: on any error the Runtime keeps the previous / default
// values. Canvas never sees an exception.
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_ROLE_PROFILES,
  normaliseRoleProfilesPayload,
  setRoleProfiles,
  type RoleProfile,
} from "@/runtime/form/RoleProfiles";

export type SpkConfigKey =
  | "spk.role_profiles"
  | "spk.workflow"
  | "spk.approval_matrix"
  | "spk.numbering"
  | "spk.automation";

interface CachedConfig {
  loadedAt: number;
  role_profiles: Record<string, RoleProfile> | null;
}

const TTL_MS = 60_000;
let cache: CachedConfig | null = null;
let inflight: Promise<void> | null = null;

export const OperationalConfigService = {
  /** Force cache reset — call after Owner edits the configuration. */
  invalidate(): void {
    cache = null;
  },

  /** Snapshot of the latest cached payload (may be null before first load). */
  snapshot(): CachedConfig | null {
    return cache;
  },

  /**
   * Load SPK operational configuration from `app_settings` and hydrate the
   * Runtime caches. Deduplicated — concurrent callers share one request.
   */
  async load(options: { force?: boolean } = {}): Promise<void> {
    if (!options.force && cache && Date.now() - cache.loadedAt < TTL_MS) return;
    if (inflight) return inflight;

    inflight = (async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["spk.role_profiles"]);

        const next: CachedConfig = {
          loadedAt: Date.now(),
          role_profiles: null,
        };

        if (!error && data) {
          for (const row of data as { key: string; value: unknown }[]) {
            if (row.key === "spk.role_profiles") {
              const norm = normaliseRoleProfilesPayload(row.value);
              if (norm) next.role_profiles = norm;
            }
          }
        }

        // Push into Runtime — either the configured payload or the default
        // fallback. Canvas will re-render via the subscribe hook.
        if (next.role_profiles) {
          setRoleProfiles(next.role_profiles, "config");
        } else {
          setRoleProfiles(DEFAULT_ROLE_PROFILES, "default");
        }

        cache = next;
      } catch {
        // Keep whatever Runtime already has; never throw into UI.
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  },
};