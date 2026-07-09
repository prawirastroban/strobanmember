// Phase 4.5 — Dynamic Form Runtime barrel.
//
// Sole translator of SPK form metadata → runtime schema. Pure functions.
// The UI layer (future phase) renders the RuntimeSchema; it does not read
// spk_form_* tables directly.
//
// Dependency DAG (no cycles):
//
//   ┌────────────────────┐
//   │ FormService (4.2)  │  metadata IO
//   └─────────┬──────────┘
//             │  FormStructure
//             ▼
//   ┌────────────────────┐        ┌────────────────────┐
//   │  SchemaBuilder     │───────▶│ RepeatableEngine   │
//   │  (orchestrator)    │───────▶│ VisibilityEngine   │──┐
//   │                    │───────▶│ ValidationEngine   │  │ shares
//   │                    │───────▶│ ConditionalEngine  │──┴─▶ ConditionEvaluator
//   └─────────┬──────────┘
//             │  RuntimeSchema
//             ▼
//        UI renderer (future phase 4.6+)
//
// Rules:
//   1. No React / DOM / Supabase queries inside runtime engines (SchemaBuilder.buildByCode
//      delegates IO to FormService).
//   2. Runtime is a pure function of (metadata, context). Same inputs → same schema.
//   3. Conditional rules cannot introduce new fields — only mutate visibility, enablement,
//      and requirement of metadata-declared fields/sections.
//   4. Repeatable groups are declared via section.visible_when.$meta.repeatable, keeping
//      Phase 4.1 DB schema untouched.
//   5. Validation runs AFTER conditional rules; hidden/disabled fields are skipped.
//   6. Runtime does not mutate DB. All persistence still flows through the Orchestrator (4.4).
//
// Sequence diagram — build & validate one form:
//
//   caller ─▶ SchemaBuilder.buildByCode(code, ctx)
//              │
//              ├─▶ FormService.getActiveTemplateByCode
//              ├─▶ FormService.loadStructure
//              └─▶ SchemaBuilder.build(structure, ctx)
//                     │
//                     ├─ per section: VisibilityEngine.sectionVisible
//                     │               RepeatableEngine.detect
//                     ├─ per field:   ValidationEngine.buildSpec (base)
//                     ├─ ConditionalEngine.apply (mutates visible/disabled/required)
//                     └─ collect deps → RuntimeSchema
//
//   caller ─▶ ValidationEngine.validate(schema, values) → ValidationOutcome

export * from "./types";
export { ConditionEvaluator } from "./ConditionEvaluator";
export { VisibilityEngine } from "./VisibilityEngine";
export { ValidationEngine } from "./ValidationEngine";
export { ConditionalEngine } from "./ConditionalEngine";
export { RepeatableEngine } from "./RepeatableEngine";
export { SchemaBuilder } from "./SchemaBuilder";