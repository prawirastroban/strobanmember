// Phase 4.5 — VisibilityEngine
// Decides which sections/fields are visible for a given actor role + workflow state
// before conditional rules run. Field-level role/state gating can be encoded inside
// section.visible_when (recommended) or through conditional rules with `state`/`role` refs.
import { ConditionEvaluator } from "./ConditionEvaluator";
import type { ConditionExpr, FormRuntimeContext, FormSectionRow, FormFieldRow } from "./types";

export const VisibilityEngine = {
  sectionVisible(section: FormSectionRow, ctx: FormRuntimeContext): boolean {
    return ConditionEvaluator.evaluate(section.visible_when as ConditionExpr, ctx);
  },

  /** Fields inherit their section visibility; conditional rules refine further. */
  fieldBaseVisible(_field: FormFieldRow, parentVisible: boolean): boolean {
    return parentVisible;
  },
};