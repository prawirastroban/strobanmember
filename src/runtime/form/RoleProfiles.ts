// Phase 5.6 — Role Profiles
// Declarative map: which SPK sections each operational role can SEE and EDIT.
// This lives in Runtime (not in Canvas) so React components stay role-agnostic.
//
// The Canvas only reads {visible, editable} through useSectionBinding — it
// never knows which role is active. When the DB-driven RuntimeSchema declares
// its own section-level visibility (via visible_when), this profile acts as an
// additional overlay: a section must be permitted by BOTH the schema AND the
// role profile to appear.
//
// Section codes are the ones already used by canvas cards (see calls to
// useSectionBinding). They match the "sec-<code>" DOM ids one-to-one.
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

export const ROLE_PROFILES: Record<SpkActor, RoleProfile> = {
  // Service Advisor / Reception — customer-facing intake + approval prep.
  reception: {
    visible: [
      "customer",
      "vehicle",
      "complaint",
      "service_order",
      "time",
      "approval",
    ],
    editable: ["customer", "vehicle", "complaint", "service_order"],
  },

  // Mechanic — inspection sections + notes. Reads customer/vehicle context.
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

  // QC — inspects mechanic output, approves or rejects.
  qc: {
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
      "approval",
    ],
    editable: ["approval"],
  },

  // Cashier — payment/approval only, everything else read-only.
  cashier: {
    visible: ["customer", "vehicle", "service_order", "approval", "time"],
    editable: ["approval"],
  },

  // Owner / Super Admin / Branch Admin — full control.
  owner: FULL,
  admin: FULL,
  admin_cabang: FULL,

  // System actor — read-only observer.
  system: { visible: "*", editable: [] },
};

export function resolveSectionAccess(
  role: SpkActor,
  code: SectionCode | string,
): { visible: boolean; editable: boolean } {
  const profile = ROLE_PROFILES[role] ?? NONE;
  const inScope = (scope: SectionScope) =>
    scope === "*" ? true : (scope as string[]).includes(code);
  return {
    visible: inScope(profile.visible),
    editable: inScope(profile.editable),
  };
}