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
import { RuntimeBus } from "@/runtime/spk/RuntimeBus";

export type SpkConfigKey =
  | "spk.role_profiles"
  | "spk.workflow"
  | "spk.approval_matrix"
  | "spk.numbering"
  | "spk.automation";

/** Defaults for the "reserved" config keys — used when Owner has not yet
 *  saved anything into `app_settings`. Kept here so the UI has a single
 *  source of truth. */
export interface ApprovalMatrixConfig {
  qc_required: boolean;
  manager_approval: boolean;
  final_approval: boolean;
}
export const DEFAULT_APPROVAL_MATRIX: ApprovalMatrixConfig = {
  qc_required: true,
  manager_approval: false,
  final_approval: true,
};

export interface NumberingConfig {
  prefix: string;
  /** tokens: {YYYY} {YY} {MM} {DD} {BRANCH} {SEQ} */
  pattern: string;
  seq_padding: number;
  reset_period: "never" | "daily" | "monthly" | "yearly";
}
export const DEFAULT_NUMBERING: NumberingConfig = {
  prefix: "SPK",
  pattern: "{PREFIX}-{YYYY}{MM}-{SEQ}",
  seq_padding: 4,
  reset_period: "monthly",
};

export interface AutomationConfig {
  auto_save: boolean;
  auto_collapse: boolean;
  auto_scroll: boolean;
  resume_position: boolean;
  auto_timeline: boolean;
}
export const DEFAULT_AUTOMATION: AutomationConfig = {
  auto_save: true,
  auto_collapse: true,
  auto_scroll: true,
  resume_position: true,
  auto_timeline: true,
};

interface CachedConfig {
  loadedAt: number;
  role_profiles: Record<string, RoleProfile> | null;
  approval_matrix: ApprovalMatrixConfig | null;
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

  /** Synchronous accessor for the last-loaded Approval Matrix (or defaults). */
  getApprovalMatrix(): ApprovalMatrixConfig {
    return cache?.approval_matrix ?? DEFAULT_APPROVAL_MATRIX;
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
          .in("key", ["spk.role_profiles", "spk.approval_matrix"]);

        const next: CachedConfig = {
          loadedAt: Date.now(),
          role_profiles: null,
          approval_matrix: null,
        };

        if (!error && data) {
          for (const row of data as { key: string; value: unknown }[]) {
            if (row.key === "spk.role_profiles") {
              const norm = normaliseRoleProfilesPayload(row.value);
              if (norm) next.role_profiles = norm;
            }
            if (row.key === "spk.approval_matrix") {
              if (row.value && typeof row.value === "object") {
                next.approval_matrix = {
                  ...DEFAULT_APPROVAL_MATRIX,
                  ...(row.value as Partial<ApprovalMatrixConfig>),
                };
              }
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

  /** Generic getter — returns raw JSON value for an SPK config key, or null. */
  async getRaw<T = unknown>(key: SpkConfigKey): Promise<T | null> {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return (data.value as T) ?? null;
  },

  /** Upsert a config key. Callers should invalidate() after saving. */
  async saveRaw(key: SpkConfigKey, value: unknown): Promise<{ error?: string }> {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key, value: value as never, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) return { error: error.message };
    // Rehydrate caches + fan out to every UI consumer (Canvas, action bar,
    // ApprovalCard, Workflow viewer) so operational rules stay in lockstep.
    cache = null;
    await OperationalConfigService.load({ force: true });
    RuntimeBus.publish("config-updated", {
      spk_id: "",
      event_type: "config-updated",
      extra: { key },
    });
    return {};
  },
};