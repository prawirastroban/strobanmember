// Phase 5.6/5.7 — Role Profiles (Operational Configuration binding)
// Declarative map: which SPK sections each operational role can SEE and EDIT.
// This lives in Runtime (not in Canvas) so React components stay role-agnostic.
//
// Phase 5.7: profiles are no longer hardcoded business rules. The defaults
// below act ONLY as a safety fallback. The active profile map is a mutable
// module-level cache populated by OperationalConfigService from the
// Operational Configuration Layer (app_settings key `spk.role_profiles`).
// Owners can edit the configuration record at runtime without redeploy.
import type { SpkActor } from "@/services/spk/types";

export type SectionCode =
  | "customer"
  | "vehicle"
  | "complaint"
  | "service_order"
  | "suspension"
  | "tyre"
  | "ac"
  | "engine"
  | "notes"
  | "time"
  | "approval";

/** "*" means every section. */
export type SectionScope = "*" | SectionCode[];

export interface RoleProfile {
  visible: SectionScope;
  editable: SectionScope;
}

const FULL: RoleProfile = { visible: "*", editable: "*" };

/** Default profile used when a role is not in the map (safest = fully hidden). */
const NONE: RoleProfile = { visible: [], editable: [] };

/**
 * DEFAULT_ROLE_PROFILES — used only when the Operational Configuration is
 * missing or fails to load. Do not read this directly in application code;
 * call `getRoleProfiles()` / `resolveSectionAccess()` instead.
 */
export const DEFAULT_ROLE_PROFILES: Record<SpkActor, RoleProfile> = {
  // Owner (app role: staff) — full control.
  owner: FULL,

  // CS Pusat (app role: admin) — full operational access.
  admin: FULL,

  // Admin Cabang (app role: admin_cabang) — full within branch scope.
  admin_cabang: FULL,

  // Mekanik Cabang (app role: mekanik) — inspection sections + notes.
  mechanic: {
    visible: [
      "vehicle",
      "complaint",
      "service_order",
      "suspension",
      "tyre",
      "ac",
      "engine",
      "notes",
      "time",
    ],
    editable: ["suspension", "tyre", "ac", "engine", "notes"],
  },

  // Customer (mapped via app role: customer → SpkActor "system") —
  // read-only observer of their own SPK.
  system: { visible: "*", editable: [] },

  // Legacy SpkActor values — inert defaults, kept only for backwards
  // compatibility with existing DB rows. Not surfaced in the config UI.
  reception: NONE,
  qc: NONE,
  cashier: NONE,
};

/** Live cache — replaced by OperationalConfigService.loadRoleProfiles(). */
let ACTIVE_ROLE_PROFILES: Record<string, RoleProfile> = { ...DEFAULT_ROLE_PROFILES };
let ACTIVE_SOURCE: "default" | "config" = "default";
const listeners = new Set<() => void>();

export function getRoleProfiles(): Record<string, RoleProfile> {
  return ACTIVE_ROLE_PROFILES;
}

export function getRoleProfilesSource(): "default" | "config" {
  return ACTIVE_SOURCE;
}

/**
 * Replace the active role-profile map. Called by OperationalConfigService
 * once the configuration record is fetched. Unknown roles from the payload
 * are merged over defaults so partial configuration remains safe.
 */
export function setRoleProfiles(
  profiles: Record<string, RoleProfile>,
  source: "default" | "config" = "config",
): void {
  ACTIVE_ROLE_PROFILES = { ...DEFAULT_ROLE_PROFILES, ...profiles };
  ACTIVE_SOURCE = source;
  listeners.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
}

/** Subscribe to configuration updates (used by React runtime to re-render). */
export function subscribeRoleProfiles(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Validate/normalise a raw config payload into a RoleProfile map. */
export function normaliseRoleProfilesPayload(
  raw: unknown,
): Record<string, RoleProfile> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, RoleProfile> = {};
  for (const [role, profile] of Object.entries(raw as Record<string, unknown>)) {
    if (!profile || typeof profile !== "object") continue;
    const p = profile as { visible?: unknown; editable?: unknown };
    const norm = (v: unknown): SectionScope | null => {
      if (v === "*") return "*";
      if (Array.isArray(v) && v.every((x) => typeof x === "string"))
        return v as SectionCode[];
      return null;
    };
    const visible = norm(p.visible);
    const editable = norm(p.editable);
    if (visible === null || editable === null) continue;
    out[role] = { visible, editable };
  }
  return Object.keys(out).length ? out : null;
}

export function resolveSectionAccess(
  role: SpkActor,
  code: SectionCode | string,
): { visible: boolean; editable: boolean } {
  const profile = ACTIVE_ROLE_PROFILES[role] ?? NONE;
  const inScope = (scope: SectionScope) =>
    scope === "*" ? true : (scope as string[]).includes(code);
  return {
    visible: inScope(profile.visible),
    editable: inScope(profile.editable),
  };
}