// Phase 4.5 — RepeatableEngine
// Detects and normalises repeatable-section metadata. A section is repeatable
// when its visible_when JSON carries a `$meta.repeatable` block. This convention
// keeps the DB schema untouched (Phase 4.1 lock) while giving the runtime a
// deterministic way to describe repeatable groups.
//
// Example section.visible_when:
//   {
//     "all": [ { "op": "eq", "left": { "state": true }, "right": "inspection" } ],
//     "$meta": { "repeatable": { "min": 0, "max": 20, "add_label": "Tambah item" } }
//   }
import type { FormSectionRow, RepeatableSpec } from "./types";

export const RepeatableEngine = {
  detect(section: FormSectionRow): RepeatableSpec | null {
    const meta = section.visible_when as Record<string, unknown> | null;
    const spec = meta?.["$meta"] as { repeatable?: Partial<RepeatableSpec> } | undefined;
    const r = spec?.repeatable;
    if (!r) return null;
    return {
      enabled: true,
      min: typeof r.min === "number" ? r.min : 0,
      max: typeof r.max === "number" ? r.max : 50,
      add_label: typeof r.add_label === "string" ? r.add_label : undefined,
    };
  },

  /** Ensure the value scope for a repeatable section is a valid array of row objects. */
  normaliseValues(
    sectionCode: string,
    spec: RepeatableSpec,
    values: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const raw = values[sectionCode];
    const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    while (arr.length < spec.min) arr.push({});
    if (arr.length > spec.max) arr.length = spec.max;
    return arr;
  },
};