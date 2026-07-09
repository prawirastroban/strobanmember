// Phase 4.5 — Dynamic Form Runtime / Shared types.
// Pure metadata → runtime schema. No React, no DOM, no Supabase calls here.
import type {
  FormFieldRow,
  FormRuleRow,
  FormSectionRow,
  FormStructure,
  FormTemplateRow,
  FormVersionRow,
} from "@/services/spk/FormService";
import type { SpkActor, SpkStatus } from "@/services/spk/types";

export type { FormFieldRow, FormRuleRow, FormSectionRow, FormStructure, FormTemplateRow, FormVersionRow };

/** Actor + workflow state that drive visibility decisions. */
export interface FormRuntimeContext {
  role: SpkActor;
  workflow_state: SpkStatus | null;
  /** Current form values keyed by field code. Repeatable sections use arrays keyed by section code. */
  values: Record<string, unknown>;
  /** Free-form flags used by conditional rules (e.g. feature toggles). */
  flags?: Record<string, unknown>;
}

export type ConditionalEffect =
  | "show"
  | "hide"
  | "enable"
  | "disable"
  | "require"
  | "optional";

export type FieldTargetType = "field" | "section";

export interface ValidationSpec {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  /** Custom error message keyed by rule code. */
  messages?: Record<string, string>;
}

export interface RuntimeFieldOption {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
}

export interface RuntimeField {
  id: string;
  code: string;
  label: string;
  type: FormFieldRow["field_type"];
  helper_text: string | null;
  visible: boolean;
  disabled: boolean;
  required: boolean;
  locked: boolean;
  default_value: unknown;
  options: RuntimeFieldOption[];
  validation: ValidationSpec;
  display_order: number;
  /** Field codes this field depends on (for reactive re-evaluation). */
  depends_on: string[];
}

export interface RuntimeSection {
  id: string;
  code: string;
  title: string;
  description: string | null;
  visible: boolean;
  collapsible: boolean;
  default_collapsed: boolean;
  display_order: number;
  repeatable: RepeatableSpec | null;
  fields: RuntimeField[];
}

export interface RepeatableSpec {
  enabled: true;
  min: number;
  max: number;
  /** Human label for the add-row action. */
  add_label?: string;
}

export interface RuntimeSchema {
  template: { id: string; code: string; name: string };
  version: { id: string; version_number: number; is_published: boolean };
  context: FormRuntimeContext;
  sections: RuntimeSection[];
  /** All fields flattened for O(1) lookup by code. */
  field_index: Record<string, RuntimeField>;
}

export type ValidationIssue = {
  field_code: string;
  rule: string;
  message: string;
};

export type ValidationOutcome =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] };

/** JSON expression evaluated by ConditionEvaluator. Intentionally minimal & metadata-driven. */
export type ConditionExpr =
  | null
  | undefined
  | { all: ConditionExpr[] }
  | { any: ConditionExpr[] }
  | { not: ConditionExpr }
  | { op: BinaryOp; left: ExprValue; right: ExprValue }
  | { truthy: ExprValue }
  | { falsy: ExprValue };

export type BinaryOp =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains";

export type ExprValue =
  | string
  | number
  | boolean
  | null
  | { var: string }
  | { state: true }
  | { role: true }
  | { flag: string }
  | { const: unknown };