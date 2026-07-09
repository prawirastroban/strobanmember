// Phase 4.6 — Dynamic Builder Runtime / Barrel
//
// Dependency diagram:
//
//   ┌──────────────────────────────────────────────────────┐
//   │              Builder Runtime (Phase 4.6)             │
//   │                                                      │
//   │   DraftEngine ──┐                                    │
//   │                 ├──► StructureEngine ──► supabase    │
//   │   VersionEngine ┤            ▲                       │
//   │                 │            │                       │
//   │   RuleEngine ───┘            │                       │
//   │                              │                       │
//   │   CompatibilityValidator ────┘                       │
//   │            ▲                                         │
//   │            │                                         │
//   │   PublishEngine ──► supabase (versions + templates)  │
//   └──────────────────────────────────────────────────────┘
//              │
//              ▼
//   Phase 4.2 FormService (read-only, unaffected)
//   Phase 4.5 Dynamic Form Runtime (consumes published metadata)
//   Phase 4.1 spk_form_* tables (no schema change)
//
// Rules:
//   • Builder Runtime writes ONLY to spk_form_* metadata tables.
//   • Never touches spk_orders / spk_events / spk_timeline.
//   • Booking Online flow is not referenced anywhere in this runtime.
//   • Published versions are frozen; edits require VersionEngine.createFrom().
export { DraftEngine } from "./DraftEngine";
export { StructureEngine } from "./StructureEngine";
export { RuleEngine } from "./RuleEngine";
export { VersionEngine } from "./VersionEngine";
export { PublishEngine } from "./PublishEngine";
export { CompatibilityValidator } from "./CompatibilityValidator";
export type {
  BuilderActor,
  BuilderDraft,
  BuilderLifecycle,
  CompatibilityIssue,
  CompatibilityReport,
  FieldDraft,
  RuleDraft,
  SectionDraft,
} from "./types";
