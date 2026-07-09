// Phase 4.5 — ConditionalEngine
// Applies spk_form_conditional_rules on top of the base schema.
// Effects: show/hide/enable/disable/require/optional. Targets: field | section.
import { ConditionEvaluator } from "./ConditionEvaluator";
import type {
  ConditionalEffect,
  ConditionExpr,
  FormRuleRow,
  FormRuntimeContext,
  RuntimeField,
  RuntimeSection,
} from "./types";

function applyEffectToField(field: RuntimeField, effect: ConditionalEffect) {
  switch (effect) {
    case "show":
      field.visible = true;
      break;
    case "hide":
      field.visible = false;
      break;
    case "enable":
      field.disabled = false;
      break;
    case "disable":
      field.disabled = true;
      break;
    case "require":
      field.required = true;
      field.validation.required = true;
      break;
    case "optional":
      field.required = false;
      field.validation.required = false;
      break;
  }
}

function applyEffectToSection(section: RuntimeSection, effect: ConditionalEffect) {
  if (effect === "show") section.visible = true;
  else if (effect === "hide") section.visible = false;
  // enable/disable/require/optional at section level cascade to all children.
  else section.fields.forEach((f) => applyEffectToField(f, effect));
}

export const ConditionalEngine = {
  apply(
    rules: FormRuleRow[],
    sections: RuntimeSection[],
    ctx: FormRuntimeContext,
  ): void {
    const byField = new Map<string, RuntimeField>();
    const bySection = new Map<string, RuntimeSection>();
    sections.forEach((s) => {
      bySection.set(s.id, s);
      s.fields.forEach((f) => byField.set(f.id, f));
    });

    for (const rule of rules) {
      const passed = ConditionEvaluator.evaluate(rule.rule as ConditionExpr, ctx);
      if (!passed) continue;
      const effect = rule.effect as ConditionalEffect;
      if (rule.target_type === "field") {
        const f = byField.get(rule.target_id);
        if (f) applyEffectToField(f, effect);
      } else if (rule.target_type === "section") {
        const s = bySection.get(rule.target_id);
        if (s) applyEffectToSection(s, effect);
      }
    }
  },

  /** Deps used by UI layer to know which fields trigger re-evaluation. */
  extractDeps(rules: FormRuleRow[]): Set<string> {
    const out = new Set<string>();
    rules.forEach((r) => ConditionEvaluator.collectDeps(r.rule, out));
    return out;
  },
};