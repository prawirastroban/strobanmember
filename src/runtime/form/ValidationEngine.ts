// Phase 4.5 — ValidationEngine
// Builds ValidationSpec from field metadata and validates runtime values.
// Runs on the finalized schema (post visibility + conditional rules) so
// hidden or disabled fields are skipped.
import type { FormFieldRow, RuntimeField, RuntimeSchema, ValidationIssue, ValidationOutcome, ValidationSpec } from "./types";

export const ValidationEngine = {
  /** Merge metadata.validation JSON with the required flag, honouring conditional overrides. */
  buildSpec(field: FormFieldRow, required: boolean): ValidationSpec {
    const raw = (field.validation ?? {}) as Partial<ValidationSpec>;
    return {
      required,
      min: raw.min,
      max: raw.max,
      minLength: raw.minLength,
      maxLength: raw.maxLength,
      pattern: raw.pattern,
      messages: raw.messages,
    };
  },

  validateField(field: RuntimeField, value: unknown): ValidationIssue[] {
    if (!field.visible || field.disabled) return [];
    const issues: ValidationIssue[] = [];
    const v = field.validation;
    const msg = (rule: string, fallback: string) =>
      v.messages?.[rule] ?? fallback;

    const empty = value === undefined || value === null || value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (v.required && empty) {
      issues.push({ field_code: field.code, rule: "required", message: msg("required", "wajib diisi") });
      return issues; // downstream rules irrelevant when empty
    }
    if (empty) return issues;

    if (typeof value === "number") {
      if (v.min !== undefined && value < v.min)
        issues.push({ field_code: field.code, rule: "min", message: msg("min", `min ${v.min}`) });
      if (v.max !== undefined && value > v.max)
        issues.push({ field_code: field.code, rule: "max", message: msg("max", `max ${v.max}`) });
    }
    if (typeof value === "string") {
      if (v.minLength !== undefined && value.length < v.minLength)
        issues.push({ field_code: field.code, rule: "minLength", message: msg("minLength", `min ${v.minLength} karakter`) });
      if (v.maxLength !== undefined && value.length > v.maxLength)
        issues.push({ field_code: field.code, rule: "maxLength", message: msg("maxLength", `max ${v.maxLength} karakter`) });
      if (v.pattern && !new RegExp(v.pattern).test(value))
        issues.push({ field_code: field.code, rule: "pattern", message: msg("pattern", "format tidak valid") });
    }
    return issues;
  },

  validate(schema: RuntimeSchema, values: Record<string, unknown>): ValidationOutcome {
    const issues: ValidationIssue[] = [];
    for (const s of schema.sections) {
      if (!s.visible) continue;
      if (s.repeatable) {
        const rows = (values[s.code] as Record<string, unknown>[] | undefined) ?? [];
        if (rows.length < s.repeatable.min) {
          issues.push({
            field_code: s.code,
            rule: "repeatable_min",
            message: `Minimal ${s.repeatable.min} entri untuk ${s.title}`,
          });
        }
        rows.forEach((row) => {
          for (const f of s.fields) issues.push(...ValidationEngine.validateField(f, row[f.code]));
        });
      } else {
        for (const f of s.fields) issues.push(...ValidationEngine.validateField(f, values[f.code]));
      }
    }
    return issues.length ? { ok: false, issues } : { ok: true };
  },
};