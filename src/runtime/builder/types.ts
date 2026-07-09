// Phase 4.6 — Dynamic Builder Runtime / Shared types.
// Pure metadata lifecycle management on top of spk_form_* tables (Phase 4.1).
// No React, no DOM. Uses supabase-js only through this runtime — Service Layer
// (Phase 4.2) remains read-optimised; builder is the write path for metadata.
import type {
  FormFieldRow,
  FormRuleRow,
  FormSectionRow,
  FormTemplateRow,
  FormVersionRow,
} from "@/services/spk/FormService";
import type { SpkFormFieldType } from "@/services/spk/types";

export type { FormFieldRow, FormRuleRow, FormSectionRow, FormTemplateRow, FormVersionRow };

/**
 * Lifecycle stages exposed by the Builder Runtime. The DB stores only two
 * signals (`spk_form_templates.is_active`, `spk_form_template_versions.is_published`)
 * plus a `snapshot.$lifecycle` convention on the version — no migrations required.
 *
 *   draft      → version.is_published = false, snapshot.$lifecycle = "draft"
 *   review     → version.is_published = false, snapshot.$lifecycle = "review"
 *   published  → version.is_published = true  (current_version_id points here)
 *   archived   → template.is_active   = false OR snapshot.$lifecycle = "archived"
 *   rollback   → transient tag applied when a previous version is re-published
 */
export type BuilderLifecycle =
  | "draft"
  | "review"
  | "published"
  | "archived"
  | "rollback";

export interface BuilderActor {
  user_id: string | null;
}

export interface SectionDraft {
  id?: string;
  code: string;
  title: string;
  description?: string | null;
  display_order?: number;
  is_collapsible?: boolean;
  default_collapsed?: boolean;
  visible_when?: unknown; // ConditionExpr | { $meta: { repeatable: ... } }
}

export interface FieldDraft {
  id?: string;
  section_id?: string; // resolved by StructureEngine when section is new
  section_code?: string; // parent section reference for draft-time creation
  code: string;
  label: string;
  field_type: SpkFormFieldType;
  helper_text?: string | null;
  is_required?: boolean;
  is_locked_after_snapshot?: boolean;
  display_order?: number;
  default_value?: unknown;
  options?: unknown;
  validation?: unknown;
}

export interface RuleDraft {
  id?: string;
  target_type: "field" | "section";
  /** Either the DB id, or the code (resolved by RuleEngine at persist time). */
  target_id?: string;
  target_code?: string;
  effect: "show" | "hide" | "enable" | "disable" | "require" | "optional";
  rule: unknown; // ConditionExpr JSON
}

/** In-memory structure of a version being edited. */
export interface BuilderDraft {
  template: FormTemplateRow;
  version: FormVersionRow;
  sections: (FormSectionRow & { fields: FormFieldRow[] })[];
  rules: FormRuleRow[];
  lifecycle: BuilderLifecycle;
}

export interface CompatibilityIssue {
  code:
    | "ORPHAN_FIELD"
    | "DUP_FIELD_CODE"
    | "DUP_SECTION_CODE"
    | "RULE_UNKNOWN_TARGET"
    | "RULE_UNKNOWN_FIELD_REF"
    | "EMPTY_SECTION"
    | "NO_SECTIONS"
    | "WORKFLOW_STATE_MISSING";
  severity: "error" | "warning";
  message: string;
  ref?: string;
}

export interface CompatibilityReport {
  ok: boolean;
  issues: CompatibilityIssue[];
}
