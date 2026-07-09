// Phase 4.5 — SchemaBuilder
// Orchestrates the Dynamic Form Runtime: metadata → RuntimeSchema.
//
// Pipeline:
//   FormService.loadStructure()   (Phase 4.2, IO)
//        │
//        ▼
//   SchemaBuilder.build()         (this module, pure)
//        ├─▶ RepeatableEngine.detect          → RepeatableSpec | null
//        ├─▶ VisibilityEngine.sectionVisible  → base section/field visibility
//        ├─▶ ValidationEngine.buildSpec       → per-field ValidationSpec
//        └─▶ ConditionalEngine.apply          → show/hide/enable/disable/require/optional
//        ▼
//   RuntimeSchema (ready for UI render in Phase 4.6+)
import { FormService, type FormStructure } from "@/services/spk/FormService";
import { fail, ok, type ServiceResult } from "@/services/spk/types";
import { ConditionEvaluator } from "./ConditionEvaluator";
import { ConditionalEngine } from "./ConditionalEngine";
import { RepeatableEngine } from "./RepeatableEngine";
import { ValidationEngine } from "./ValidationEngine";
import { VisibilityEngine } from "./VisibilityEngine";
import type {
  FormFieldRow,
  FormRuntimeContext,
  RuntimeField,
  RuntimeFieldOption,
  RuntimeSchema,
  RuntimeSection,
} from "./types";

function normaliseOptions(field: FormFieldRow): RuntimeFieldOption[] {
  const raw = field.options;
  if (!raw || !Array.isArray(raw)) return [];
  const mapped: (RuntimeFieldOption | null)[] = raw.map((o) => {
    if (o && typeof o === "object" && "value" in o && "label" in o) {
      const opt = o as { value: unknown; label: unknown; disabled?: unknown };
      return {
        value: opt.value as RuntimeFieldOption["value"],
        label: String(opt.label),
        disabled: Boolean(opt.disabled),
      };
    }
    if (typeof o === "string" || typeof o === "number") {
      return { value: o, label: String(o) };
    }
    return null;
  });
  return mapped.filter((v): v is RuntimeFieldOption => v !== null);
}

function buildField(field: FormFieldRow, sectionVisible: boolean): RuntimeField {
  const required = Boolean(field.is_required);
  return {
    id: field.id,
    code: field.code,
    label: field.label,
    type: field.field_type,
    helper_text: field.helper_text,
    visible: VisibilityEngine.fieldBaseVisible(field, sectionVisible),
    disabled: false,
    required,
    locked: Boolean(field.is_locked_after_snapshot),
    default_value: field.default_value,
    options: normaliseOptions(field),
    validation: ValidationEngine.buildSpec(field, required),
    display_order: field.display_order,
    depends_on: [], // populated below
  };
}

export const SchemaBuilder = {
  /** Pure build: metadata + context → RuntimeSchema. No IO. */
  build(structure: FormStructure, context: FormRuntimeContext): RuntimeSchema {
    const sections: RuntimeSection[] = structure.sections.map((s) => {
      const baseVisible = VisibilityEngine.sectionVisible(s, context);
      const repeatable = RepeatableEngine.detect(s);
      const fields = s.fields.map((f) => buildField(f, baseVisible));
      return {
        id: s.id,
        code: s.code,
        title: s.title,
        description: s.description,
        visible: baseVisible,
        collapsible: s.is_collapsible,
        default_collapsed: s.default_collapsed,
        display_order: s.display_order,
        repeatable,
        fields,
      };
    });

    // Apply conditional rules on top of base visibility/validation.
    ConditionalEngine.apply(structure.rules, sections, context);

    // Precompute per-field dependency lists from rules that target them.
    const depsBySection = new Map<string, Set<string>>();
    const depsByField = new Map<string, Set<string>>();
    for (const rule of structure.rules) {
      const deps = ConditionEvaluator.collectDeps(rule.rule);
      if (rule.target_type === "field") {
        const set = depsByField.get(rule.target_id) ?? new Set<string>();
        deps.forEach((d) => set.add(d));
        depsByField.set(rule.target_id, set);
      } else if (rule.target_type === "section") {
        const set = depsBySection.get(rule.target_id) ?? new Set<string>();
        deps.forEach((d) => set.add(d));
        depsBySection.set(rule.target_id, set);
      }
    }

    const field_index: Record<string, RuntimeField> = {};
    for (const s of sections) {
      const secDeps = depsBySection.get(s.id) ?? new Set<string>();
      for (const f of s.fields) {
        const own = depsByField.get(f.id) ?? new Set<string>();
        secDeps.forEach((d) => own.add(d));
        f.depends_on = Array.from(own);
        field_index[f.code] = f;
      }
    }

    return {
      template: {
        id: structure.template.id,
        code: structure.template.code,
        name: structure.template.name,
      },
      version: {
        id: structure.version.id,
        version_number: structure.version.version_number,
        is_published: structure.version.is_published,
      },
      context,
      sections,
      field_index,
    };
  },

  /** Convenience: load template metadata via FormService, then build. */
  async buildByCode(
    templateCode: string,
    context: FormRuntimeContext,
  ): Promise<ServiceResult<RuntimeSchema>> {
    const t = await FormService.getActiveTemplateByCode(templateCode);
    if (t.ok === false) return fail(t.error, t.code);
    if (!t.data || !t.data.current_version_id) return fail("template_not_found", "FORM_TPL_MISSING");
    const s = await FormService.loadStructure(t.data.current_version_id);
    if (s.ok === false) return fail(s.error, s.code);
    if (!s.data) return fail("form_structure_not_found", "FORM_STRUCTURE_MISSING");
    return ok(SchemaBuilder.build(s.data, context));
  },
};